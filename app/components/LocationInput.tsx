'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, MapPin } from 'lucide-react'
import { SWEDISH_LAN, SWEDISH_KOMMUNER, getKommunerByLan, searchKommuner, formatLocation, type SwedishLocation } from '@/lib/swedish-locations'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function LocationInput({ 
  value, 
  onChange, 
  placeholder = 'T.ex. Stockholm eller välj län → kommun',
  required = false,
  className = ''
}: LocationInputProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SwedishLocation[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedLan, setSelectedLan] = useState<string>('')
  const [availableKommuner, setAvailableKommuner] = useState<string[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sök med autocomplete
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchKommuner(searchQuery)
      setSuggestions(results)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchQuery])

  // Uppdatera tillgängliga kommuner när län väljs
  useEffect(() => {
    if (selectedLan) {
      const kommuner = getKommunerByLan(selectedLan)
      setAvailableKommuner(kommuner)
    } else {
      setAvailableKommuner([])
    }
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
    setSearchQuery(location.kommun)
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
      setSearchQuery(kommun)
      setSelectedLan('')
      setAvailableKommuner([])
      setShowDropdown(false)
    }
  }

  // Synka searchQuery med value när value ändras externt (endast om det är ett nytt värde)
  useEffect(() => {
    if (!value) {
      // Inget värde → rensa visningen om något står kvar
      if (searchQuery) {
        setSearchQuery('')
      }
      return
    }

    // Skydd: om value råkar vara en e-postadress (t.ex. gammal data), rensa fältet helt
    const looksLikeEmail = /\S+@\S+\.\S+/.test(value)
    if (looksLikeEmail) {
      if (searchQuery) {
        setSearchQuery('')
      }
      // Nolla även värdet uppåt så det inte sparas tillbaka som plats
      onChange('')
      return
    }

    if (value !== searchQuery) {
      // Om value är satt men inte matchar searchQuery, visa bara kommunnamnet
      const kommunName = value.split(',')[0].trim()
      if (kommunName !== searchQuery) {
        setSearchQuery(kommunName)
      }
    }
  }, [value]) // Inte searchQuery i dependencies för att undvika loop

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    
    // Om användaren rensar, rensa också value
    if (!newValue.trim()) {
      onChange('')
    }
  }

  const handleInputFocus = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(true)
    }
    setShowDropdown(false) // Stäng dropdown när input får fokus
  }

  // Visa nuvarande värde i input
  const displayValue = searchQuery

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
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          className="w-full pl-11 pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Välj län
              </label>
              <select
                value={selectedLan}
                onChange={(e) => setSelectedLan(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Välj kommun
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectKommun(e.target.value)
                    }
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
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
