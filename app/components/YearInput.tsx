'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

interface YearInputProps {
  value: string
  onChange: (year: string) => void
  required?: boolean
}

export default function YearInput({ value, onChange, required = false }: YearInputProps) {
  const [query, setQuery] = useState(value || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Generera år: senaste 30 åren + 1 år framåt
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let i = currentYear + 1; i >= currentYear - 30; i--) {
      years.push(i)
    }
    return years
  }, [])

  // Synka query med value (använd value direkt om query är tom)
  const currentQuery = value && !query ? value : query

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
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredYears = currentQuery
    ? yearOptions.filter((year) => String(year).includes(currentQuery))
    : []

  const handleSelect = (selectedYear: number) => {
    setQuery(String(selectedYear))
    onChange(String(selectedYear))
    setShowSuggestions(false)
    setShowDropdown(false)
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
        Årsmodell {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
          placeholder="T.ex. 2020"
          value={currentQuery}
          onChange={(e) => {
            const val = e.target.value
            setQuery(val)
            onChange(val)
            setShowSuggestions(val.length > 0)
          }}
          onFocus={() => {
            if (currentQuery) {
              setShowSuggestions(true)
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            setShowDropdown(!showDropdown)
            setShowSuggestions(false)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-text/50 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition"
          title="Välj från lista"
        >
          ▼
        </button>
      </div>

      {showSuggestions && filteredYears.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredYears.slice(0, 10).map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleSelect(year)}
              className="w-full text-left px-4 py-2.5 hover:bg-brand-green/10 transition-colors border-b border-gray-50 last:border-b-0"
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {yearOptions.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleSelect(year)}
              className="w-full text-left px-4 py-2.5 hover:bg-brand-green/10 transition-colors border-b border-gray-50 last:border-b-0"
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
