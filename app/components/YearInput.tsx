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
  const [error, setError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const currentYear = new Date().getFullYear()
  const minYear = 1960
  const maxYear = currentYear + 1

  // Generera år: från 1960 till nuvarande år + 1
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let i = currentYear + 1; i >= 1960; i--) {
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

  // Validera 4-siffrigt årtalsformat
  const validateYear = (yearStr: string): boolean => {
    if (!yearStr) return true // Tomt är OK (valideras vid submit om required)
    
    // Måste vara exakt 4 siffror
    if (!/^\d{4}$/.test(yearStr)) {
      return false
    }
    
    const yearNum = parseInt(yearStr, 10)
    // Måste vara mellan 1960 och nuvarande år + 1
    return yearNum >= minYear && yearNum <= maxYear
  }

  const filteredYears = currentQuery
    ? yearOptions.filter((year) => String(year).includes(currentQuery))
    : []

  const handleSelect = (selectedYear: number) => {
    const yearStr = String(selectedYear)
    setQuery(yearStr)
    onChange(yearStr)
    setError('')
    setShowSuggestions(false)
    setShowDropdown(false)
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const handleInputChange = (val: string) => {
    // Tillåt endast siffror
    const numericOnly = val.replace(/\D/g, '')
    
    // Begränsa till max 4 siffror
    const limited = numericOnly.slice(0, 4)
    
    setQuery(limited)
    onChange(limited)
    
    // Validera om användaren har skrivit 4 siffror
    if (limited.length === 4) {
      if (validateYear(limited)) {
        setError('')
      } else {
        setError(`Året måste vara mellan ${minYear} och ${maxYear}`)
      }
    } else if (limited.length > 0) {
      setError('') // Rensa fel medan användaren skriver
    } else {
      setError('')
    }
    
    setShowSuggestions(limited.length > 0)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
        Modellår {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4}"
          required={required}
          maxLength={4}
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
          }`}
          placeholder="T.ex. 2020"
          value={currentQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (currentQuery) {
              setShowSuggestions(true)
            }
          }}
          onBlur={() => {
            // Validera vid blur om fältet är ifyllt
            if (currentQuery && currentQuery.length === 4) {
              if (!validateYear(currentQuery)) {
                setError(`Året måste vara mellan ${minYear} och ${maxYear}`)
              }
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

      {error && (
        <p className="mt-1 text-sm text-red-500 antialiased">{error}</p>
      )}
    </div>
  )
}
