import os
import json
import urllib.request
import urllib.error
import re
import time

# Configuration
DATA_DIR = "/Users/jz/aquiferpe-basecamp/data/houzz_architect"
URL = "https://mriyerznhngrgejlmtdx.supabase.co/rest/v1/architect?on_conflict=houzz_id"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yaXllcnpuaG5ncmdlamxtdGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzM0NDgsImV4cCI6MjA4OTU0OTQ0OH0.Bv_v22Q-Vd9PuIGHpw6ukVvAY8zJxv3auFv-NjqfjAI"
BATCH_SIZE = 200

def extract_zip(address):
    if not address:
        return None
    # Match the last 5-digit number (with optional ZIP+4 suffix)
    match = re.search(r'\b(\d{5})(?:-\d{4})?(?=\D*$)', address)
    if match:
        return match.group(1)
    return None

def geocode_zip(zip_code, cache):
    if not zip_code:
        return None, None
    if zip_code in cache:
        return cache[zip_code]
    
    url = f"https://api.zippopotam.us/us/{zip_code}"
    print(f"Geocoding zipcode {zip_code}...")
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            if res.status == 200:
                data = json.loads(res.read().decode("utf-8"))
                if data.get("places") and len(data["places"]) > 0:
                    place = data["places"][0]
                    lat = float(place.get("latitude"))
                    lng = float(place.get("longitude"))
                    cache[zip_code] = (lat, lng)
                    time.sleep(0.08)  # sleep to prevent hitting rate limits
                    return lat, lng
    except Exception as e:
        print(f"Failed to geocode zipcode {zip_code}: {e}")
    
    cache[zip_code] = (None, None)
    return None, None

def load_records():
    records = []
    zip_cache = {}
    print(f"Scanning directory: {DATA_DIR}")
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".json")]
    total_files = len(files)
    
    for idx, filename in enumerate(files, 1):
        houzz_id = os.path.splitext(filename)[0]
        file_path = os.path.join(DATA_DIR, filename)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            address = data.get("address")
            zip_code = extract_zip(address)
            lat, lng = geocode_zip(zip_code, zip_cache)
            
            # Construct record matching table schema
            record = {
                "houzz_id": houzz_id,
                "business_name": data.get("business_name"),
                "typical_job_cost": data.get("typical_job_cost"),
                "phone_number": data.get("phone_number"),
                "license_number": data.get("license_number"),
                "website": data.get("website"),
                "number_of_followers": int(data.get("number_of_followers", 0) or 0),
                "address": address,
                "facebook_link": data.get("facebook_link"),
                "linkedin_link": data.get("linkedin_link"),
                "number_of_reviews": int(data.get("number_of_reviews", 0) or 0),
                "review_score": float(data.get("review_score", 0.0) or 0.0),
                "status": data.get("status", "Active"),
                "latitude": lat,
                "longitude": lng
            }
            records.append(record)
            if idx % 100 == 0 or idx == total_files:
                print(f"Processed {idx}/{total_files} files...")
        except Exception as e:
            print(f"Error reading file {filename}: {e}")
    print(f"Successfully loaded {len(records)} records from JSON files.")
    return records

def upload_batch(batch, batch_index, total_batches):
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    req = urllib.request.Request(
        URL,
        data=json.dumps(batch).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            if res.status in (200, 201):
                print(f"Batch {batch_index}/{total_batches} ({len(batch)} records) uploaded successfully.")
                return True
            else:
                print(f"Failed to upload batch {batch_index}/{total_batches}. Status: {res.status}")
                return False
    except urllib.error.HTTPError as e:
        print(f"HTTP Error on batch {batch_index}/{total_batches}: {e.code} - {e.reason}")
        print("Details:", e.read().decode("utf-8"))
        return False
    except Exception as e:
        print(f"Connection error on batch {batch_index}/{total_batches}: {e}")
        return False

def main():
    records = load_records()
    if not records:
        print("No records found to upload.")
        return

    # Split records into batches
    batches = [records[i:i + BATCH_SIZE] for i in range(0, len(records), BATCH_SIZE)]
    total_batches = len(batches)
    print(f"Split data into {total_batches} batches.")

    success_count = 0
    for idx, batch in enumerate(batches, start=1):
        if upload_batch(batch, idx, total_batches):
            success_count += 1
        else:
            print(f"Stopping execution due to failure in batch {idx}.")
            break

    if success_count == total_batches:
        print("Import completed successfully!")
    else:
        print(f"Import failed. Only {success_count}/{total_batches} batches succeeded.")

if __name__ == "__main__":
    main()
