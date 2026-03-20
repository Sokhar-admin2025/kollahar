'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

interface BilarYearInputProps {
  value: string
  onChange: (year: string) => void
  required?: boolean
}

export default function BilarYearInput({ value, onChange, required = false }: BilarYearInputProps) {
  const [query, setQuery] = useState(value || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()
  const minYear = 1960
  const maxYear = currentYear + 1

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let i = currentYear + 1; i >= 1960; i--) {
      years.push(i)
    }
    return years
  }, [currentYear])

  const currentQuery = value && !query ? value : query

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const validateYear = (yearStr: string): boolean => {
    if (!yearStr) return true
    if (!/^\d{4}$/.test(yearStr)) return false
    const yearNum = parseInt(yearStr, 10)
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
    inputRef.current?.blur()
  }

  const handleInputChange = (val: string) => {
    const numericOnly = val.replace(/\D/g, '').slice(0, 4)
    setQuery(numericOnly)
    onChange(numericOnly)
    if (numericOnly.length === 4) {
      setError(validateYear(numericOnly) ? '' : `Året måste vara mellan ${minYear} och ${maxYear}`)
    } else {
      setError('')
    }
    setShowSuggestions(numericOnly.length > 0)
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
        Modellår {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4}"
          required={required}
          maxLength={4}
          placeholder="T.ex. 2020"
          value={currentQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (currentQuery) setShowSuggestions(true) }}
          onBlur={() => {
            if (currentQuery && currentQuery.length === 4 && !validateYear(currentQuery)) {
              setError(`Året måste vara mellan ${minYear} och ${maxYear}`)
            }
          }}
          className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{
            borderColor: error ? '#EF4444' : '#E2E8F0',
            color: '#0F172A',
          }}
        />
        <button
          type="button"
          onClick={() => {
            setShowDropdown(!showDropdown)
            setShowSuggestions(false)
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs px-1 rounded transition"
          style={{ color: '#94A3B8' }}
          title="Välj från lista"
        >
          ▼
        </button>
      </div>

      {showSuggestions && filteredYears.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          {filteredYears.slice(0, 10).map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleSelect(year)}
              className="w-full text-left px-3 py-2 text-sm transition"
              style={{ borderBottom: '1px solid #F1F5F9', color: '#0F172A' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = ''
              }}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          {yearOptions.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleSelect(year)}
              className="w-full text-left px-3 py-2 text-sm transition"
              style={{ borderBottom: '1px solid #F1F5F9', color: '#0F172A' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = ''
              }}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}
