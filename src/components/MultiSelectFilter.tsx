import { useState, useEffect, useRef, useMemo } from 'react'

interface MultiSelectFilterProps {
  label: string
  value: string
  onChange: (value: string) => void
  fetchOptions: (search: string) => Promise<string[]>
  placeholder?: string
}

export default function MultiSelectFilter({
  label,
  value,
  onChange,
  fetchOptions,
  placeholder = 'Select...'
}: MultiSelectFilterProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync internal state with prop value
  useEffect(() => {
    if (value) {
      setSelected(value.split('|').map(s => s.trim()).filter(Boolean))
    } else {
      setSelected([])
    }
  }, [value])

  // Fetch options when search term changes or dropdown opens
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

  // Sort and filter options to show selected items at the top
  const displayOptions = useMemo(() => {
    // Combine fetched options and currently selected items
    // This ensures selected items stay visible even if they aren't in the current search results
    const combined = Array.from(new Set([...selected, ...options]));
    
    return combined
      .filter(option => {
        // If there's a search term, only show items that match it
        if (!searchTerm) return true;
        return option.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const aSelected = selected.includes(a);
        const bSelected = selected.includes(b);
        
        // Selected items first
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        
        // Both selected or both unselected: alphabetical
        return a.localeCompare(b);
      });
  }, [options, selected, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = (option: string) => {
    let newSelected: string[]
    if (selected.includes(option)) {
      newSelected = selected.filter(item => item !== option)
    } else {
      newSelected = [...selected, option]
    }
    
    setSelected(newSelected)
    onChange(newSelected.join('|'))
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected([])
    setSearchTerm('')
    onChange('')
  }

  const displayValue = selected.length > 0 
    ? `${selected.length} selected` 
    : ''

  return (
    <div className="flex flex-col relative" ref={wrapperRef}>
      <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
        {label}
      </label>
      
      {/* Trigger Area */}
      <div 
        className="relative bg-white border border-slate-300 rounded-lg cursor-pointer flex items-center min-w-[12rem]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="px-4 py-1.5 text-sm flex-grow truncate h-9 flex items-center text-slate-700">
          {displayValue || <span className="text-slate-400">{placeholder}</span>}
        </div>
        
        <div className="flex items-center pr-2">
          {selected.length > 0 && (
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 mr-1 p-1"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-lg z-20 flex flex-col max-h-80">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-grow p-1">
            {loading ? (
              <div className="p-2 text-sm text-slate-500 text-center">Loading...</div>
            ) : displayOptions.length === 0 ? (
              <div className="p-2 text-sm text-slate-500 text-center">No results found</div>
            ) : (
              displayOptions.map((option, index) => {
                const isSelected = selected.includes(option)
                return (
                  <label 
                    key={index}
                    className="flex items-center px-3 py-2 text-sm hover:bg-slate-50 rounded cursor-pointer"
                    onClick={(e) => e.stopPropagation()} // Prevent closing on click
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option)}
                      className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 mr-3"
                    />
                    <span className={`truncate ${isSelected ? 'font-medium text-primary-700' : 'text-slate-700'}`}>
                      {option}
                    </span>
                  </label>
                )
              })
            )}
          </div>
          
          {/* Selected Summary / Footer */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 text-right">
            {selected.length} selected
          </div>
        </div>
      )}
    </div>
  )
}
