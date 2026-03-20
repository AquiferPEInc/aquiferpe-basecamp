import { useState, useEffect, useRef } from 'react'

interface SearchableFilterProps {
  label: string
  value: string
  onChange: (value: string) => void
  fetchOptions: (search: string) => Promise<string[]>
  placeholder?: string
}

export default function SearchableFilter({
  label,
  value,
  onChange,
  fetchOptions,
  placeholder = 'Type to search...'
}: SearchableFilterProps) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchOptions(searchTerm)
        setOptions(data)
      } catch (error) {
        console.error('Error fetching options:', error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchData, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, isOpen, fetchOptions])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: string) => {
    setSearchTerm(option)
    onChange(option)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchTerm('')
    onChange('')
    setIsOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue)
    // If user clears the input, also clear the filter
    if (!newValue) {
      onChange('')
    }
  }

  return (
    <div className="flex flex-col relative" ref={wrapperRef}>
      <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          className="input py-1.5 text-sm w-48 pr-8"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 w-48 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
          {loading && (
            <div className="p-2 text-sm text-slate-500">Loading...</div>
          )}
          {!loading && options.length === 0 && (
            <div className="p-2 text-sm text-slate-500">No results found</div>
          )}
          {!loading && options.map((option, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left p-2 text-sm hover:bg-slate-100 cursor-pointer"
              onClick={() => handleSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
