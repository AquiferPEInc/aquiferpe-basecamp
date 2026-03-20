import { useState, useRef, useEffect } from 'react'
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", 
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", 
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", 
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", 
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", 
  "Washington", "West Virginia", "Wisconsin", "Wyoming", "U.S. States"
]

interface StateFilterProps {
  selectedStates: string[]
  onStatesChange: (states: string[]) => void
}

export default function StateFilter({ selectedStates, onStatesChange }: StateFilterProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelect = (state: string) => {
    if (selectedStates.includes(state)) {
      onStatesChange(selectedStates.filter(s => s !== state))
    } else {
      onStatesChange([...selectedStates, state])
    }
  }

  const handleRemove = (stateToRemove: string) => {
    onStatesChange(selectedStates.filter(s => s !== stateToRemove))
  }

  const filteredStates = US_STATES.filter(state =>
    state.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative w-full space-y-2" ref={dropdownRef}>
      <button
        type="button"
        className="input w-full flex justify-between items-center text-left py-2"
        onClick={() => setOpen(!open)}
      >
        <span className="text-slate-700">
          {selectedStates.length === 0
            ? "Filter by state..."
            : `${selectedStates.length} state${selectedStates.length !== 1 ? 's' : ''} selected`
          }
        </span>
        <svg className="h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 w-full bg-white border border-slate-300 rounded-md shadow-lg mt-1">
          <input
            type="text"
            placeholder="Search states..."
            className="input w-full p-2 border-b border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto">
            {filteredStates.length === 0 ? (
              <div className="p-2 text-slate-500">No state found.</div>
            ) : (
              filteredStates.map((state) => (
                <div
                  key={state}
                  className="flex items-center p-2 hover:bg-slate-100 cursor-pointer"
                  onClick={() => handleSelect(state)}
                >
                  <input
                    type="checkbox"
                    checked={selectedStates.includes(state)}
                    readOnly
                    className="mr-2"
                  />
                  {state}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Selected states tags */}
      {selectedStates.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedStates.map((state) => (
            <span key={state} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {state}
              <button
                type="button"
                onClick={() => handleRemove(state)}
                className="flex-shrink-0 ml-1.5 h-3 w-3 rounded-full hover:bg-primary-200 inline-flex items-center justify-center text-primary-600"
              >
                <span className="sr-only">Remove {state}</span>
                <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}