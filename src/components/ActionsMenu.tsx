import { useState, useEffect, useRef } from 'react'

interface Action {
  label: string
  onClick: () => void
}

interface ActionsMenuProps {
  actions: Action[]
}

export default function ActionsMenu({ actions }: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleButtonClick = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top

    // Approximate menu height: ~40px per action + padding, plus a small buffer
    const estimatedMenuHeight = actions.length * 40 + 16 + 10

    // If not enough space below but enough space above, position above
    // This prevents the menu from being hidden when clicking near the bottom of the viewport
    if (spaceBelow < estimatedMenuHeight && spaceAbove >= estimatedMenuHeight) {
      setPlacement('top')
    } else {
      setPlacement('bottom')
    }

    setIsOpen(true)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuRef])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div>
        <button
          ref={buttonRef}
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-2 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
          onClick={handleButtonClick}
          aria-label="Actions"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className={`${placement === 'bottom' ? 'origin-top-right mt-2' : 'origin-bottom-right bottom-full mb-2'} absolute right-0 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {actions.map((action) => (
              <a
                href="#"
                key={action.label}
                onClick={(e) => {
                  e.preventDefault()
                  action.onClick()
                  setIsOpen(false)
                }}
                className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100"
                role="menuitem"
              >
                {action.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
