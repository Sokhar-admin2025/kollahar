'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, MapPin } from 'lucide-react'
import {
  SWEDISH_LAN,
  getKommunerByLan,
  searchKommuner,
  formatLocation,
  type SwedishLocation,
} from '@/lib/swedish-locations'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  hasError?: boolean
  /** Sätt till "off" på inställningssidan så webbläsaren inte fyller i e-post i platsfältet */
  autoComplete?: 'on' | 'off' | 'address-level2'
}

export default function LocationInput({
  value,
  onChange,
  placeholder = 'T.ex. Stockholm eller välj län → kommun',
  required = false,
  className = '',
  hasError = false,
  autoComplete = 'address-level2',
}: LocationInputProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedLan, setSelectedLan] = useState<string>('')
  const [isUserTyping, setIsUserTyping] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (!showSuggestions || !isUserTyping || !searchQuery.trim()) {
      return []
    }
    return searchKommuner(searchQuery)
  }, [searchQuery, isUserTyping, showSuggestions])

  const availableKommuner = useMemo(() => {
    if (!selectedLan) return []
    return getKommunerByLan(selectedLan)
  }, [selectedLan])

  // Stäng vid klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSuggestion = (location: SwedishLocation) => {
    const formatted = `${location.kommun}, ${location.län}`
    onChange(formatted)
    // Visa kommunnamnet i fältet istället för att rensa det
    setIsUserTyping(false)
    setShowSuggestions(false)
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const handleSelectKommun = (kommun: string) => {
    if (selectedLan) {
      const formatted = `${kommun}, ${selectedLan}`
      onChange(formatted)
      // Visa kommunnamnet i fältet
      setIsUserTyping(false)
      setSelectedLan('') // availableKommuner beräknas automatiskt från selectedLan
      setShowDropdown(false)
    }
  }

  const displayValue = useMemo(() => {
    if (isUserTyping) return searchQuery
    if (!value) return ''
    const looksLikeEmail = /\S+@\S+\.\S+/.test(value)
    if (looksLikeEmail) return ''
    return value.split(',')[0].trim()
  }, [isUserTyping, searchQuery, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    setIsUserTyping(true)
    setShowSuggestions(true)
    
    // Om användaren rensar, rensa också value
    if (!newValue.trim()) {
      onChange('')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const raw = (e.currentTarget.value || '').trim()
      if (!raw) return
      const formatted = formatLocation(raw)
      onChange(formatted)
      setIsUserTyping(false)
      setShowSuggestions(false)
    }
  }

  const handleInputFocus = () => {
    // Visa inte suggestions automatiskt här; de visas först när användaren börjar skriva
    setShowDropdown(false) // Stäng dropdown när input får fokus
  }

  return (
    <div className={`relative ${className}`}>
      {/* Input med autocomplete */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50 z-10">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          name="location"
          autoComplete={autoComplete}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-11 pr-10 p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased ${hasError ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}`}
        />
        <button
          type="button"
          onClick={() => {
            setShowDropdown(!showDropdown)
            setShowSuggestions(false) // Stäng autocomplete när dropdown öppnas
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-text/50 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition"
          title="Välj från lista"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Autocomplete-förslag */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((location, index) => (
            <button
              key={`${location.kommun}-${location.län}-${index}`}
              type="button"
              onClick={() => handleSelectSuggestion(location)}
              className="w-full text-left px-4 py-2.5 hover:bg-brand-green/10 transition-colors border-b border-gray-50 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-green flex-shrink-0" />
                <div>
                  <div className="font-medium text-brand-text">{location.kommun}</div>
                  <div className="text-xs text-brand-text/60">{location.län}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Dropdown för län → kommun */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4"
        >
          <div className="space-y-4">
            {/* Län-dropdown */}
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                Välj län
              </label>
              <select
                value={selectedLan}
                onChange={(e) => setSelectedLan(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
              >
                <option value="">-- Välj län --</option>
                {SWEDISH_LAN.map((lan) => (
                  <option key={lan} value={lan}>
                    {lan}
                  </option>
                ))}
              </select>
            </div>

            {/* Kommun-dropdown (visas bara när län är valt) */}
            {selectedLan && availableKommuner.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                  Välj kommun
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectKommun(e.target.value)
                    }
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
                >
                  <option value="">-- Välj kommun --</option>
                  {availableKommuner.map((kommun) => (
                    <option key={kommun} value={kommun}>
                      {kommun}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
