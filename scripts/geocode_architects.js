import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mriyerznhngrgejlmtdx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yaXllcnpuaG5ncmdlamxtdGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzM0NDgsImV4cCI6MjA4OTU0OTQ0OH0.Bv_v22Q-Vd9PuIGHpw6ukVvAY8zJxv3auFv-NjqfjAI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log('Fetching architects without coordinates...')
  const { data: architects, error } = await supabase
    .from('architect')
    .select('id, address')
    .is('latitude', null)
  
  if (error) {
    console.error('Error fetching architects:', error)
    return
  }

  console.log(`Found ${architects.length} architects to geocode.`)
  if (architects.length === 0) return

  // Parse zipcodes using correct regex matching the LAST 5-digit number (with optional ZIP+4 suffix)
  const zipToCoords = new Map()

  const getZip = (address) => {
    if (!address) return null
    const match = address.match(/\b\d{5}(?:-\d{4})?(?=\D*$)/)
    if (match) {
      return match[0].substring(0, 5)
    }
    return null
  }

  // Find all unique zipcodes
  const zips = new Set()
  for (const arc of architects) {
    const zip = getZip(arc.address)
    if (zip) zips.add(zip)
  }

  console.log(`Found ${zips.size} unique zipcodes to geocode.`)

  // Geocode unique zipcodes
  let count = 0
  for (const zip of zips) {
    count++
    console.log(`[${count}/${zips.size}] Geocoding zipcode ${zip}...`)
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`)
      if (res.status === 200) {
        const json = await res.json()
        if (json.places && json.places[0]) {
          const lat = parseFloat(json.places[0].latitude)
          const lng = parseFloat(json.places[0].longitude)
          zipToCoords.set(zip, { lat, lng })
        }
      } else {
        console.warn(`Zipcode ${zip} not found by zippopotam.us`)
      }
    } catch (err) {
      console.error(`Error geocoding ${zip}:`, err.message)
    }
    // Sleep to avoid rate limit
    await new Promise(r => setTimeout(r, 80))
  }

  console.log('Updating architects in database...')
  let updatedCount = 0
  for (const arc of architects) {
    const zip = getZip(arc.address)
    if (zip && zipToCoords.has(zip)) {
      const { lat, lng } = zipToCoords.get(zip)
      const { error: updateError } = await supabase
        .from('architect')
        .update({ latitude: lat, longitude: lng })
        .eq('id', arc.id)
      
      if (updateError) {
        console.error(`Error updating architect ${arc.id}:`, updateError)
      } else {
        updatedCount++
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} architects.`)
}

main()
