'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { CAR_BRANDS, searchCarMakeOrModel, getModelsByMake } from '@/lib/car-data'

interface CarMakeModelComboboxProps {
  value: { make: string; model: string }
  onChange: (value: { make: string; model: string }) => void
  required?: boolean
  className?: string
}

export default function CarMakeModelCombobox({
  value,
  onChange,
  required = false,
  className = ''
}: CarMakeModelComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectedMake = value.make || ''
  const selectedModel = value.model || ''
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sökresultat baserat på query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Om inget söks, visa alla märken
      return CAR_BRANDS.map(brand => ({ type: 'make' as const, value: brand.brand, brand: undefined }))
    }
    return searchCarMakeOrModel(searchQuery)
  }, [searchQuery])

  // Filtrerade modeller för valt märke
  const availableModels = useMemo(() => {
    if (!selectedMake) return []
    return getModelsByMake(selectedMake)
  }, [selectedMake])

  // Display-värde
  const displayValue = useMemo(() => {
    if (selectedMake && selectedModel) {
      return `${selectedMake}, ${selectedModel}`
    }
    if (selectedMake) {
      return selectedMake
    }
    return ''
  }, [selectedMake, selectedModel])

  // Hantera val av märke
  const handleSelectMake = (make: string) => {
    setSearchQuery('')
    setIsOpen(false)
    onChange({ make, model: '' })
  }

  // Hantera val av modell
  const handleSelectModel = (model: string) => {
    setSearchQuery('')
    setIsOpen(false)
    onChange({ make: selectedMake, model })
  }

  // Rensa val
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchQuery('')
    onChange({ make: '', model: '' })
    inputRef.current?.focus()
  }

  // Stäng vid klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Sök märke eller modell..."
          required={required}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-brand-text antialiased"
        />
        {displayValue && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Rensa val"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-96 overflow-y-auto">
          {selectedMake && availableModels.length > 0 && !searchQuery && (
            <div className="p-2 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Modeller för {selectedMake}</div>
              {availableModels.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleSelectModel(model)}
                  className={`w-full text-left px-4 py-2 hover:bg-brand-beige rounded-lg transition-colors ${
                    selectedModel === model ? 'bg-brand-green/10 text-brand-green font-semibold' : 'text-brand-text'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          )}

          {searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((result, index) => {
                if (result.type === 'make') {
                  return (
                    <button
                      key={`make-${result.value}`}
                      type="button"
                      onClick={() => handleSelectMake(result.value)}
                      className={`w-full text-left px-4 py-2 hover:bg-brand-beige rounded-lg transition-colors ${
                        selectedMake === result.value ? 'bg-brand-green/10 text-brand-green font-semibold' : 'text-brand-text'
                      }`}
                    >
                      <span className="font-semibold">{result.value}</span>
                    </button>
                  )
                } else {
                  return (
                    <button
                      key={`model-${result.brand}-${result.value}-${index}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setIsOpen(false)
                        onChange({ make: result.brand || '', model: result.value })
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-brand-beige rounded-lg transition-colors ${
                        selectedMake === result.brand && selectedModel === result.value
                          ? 'bg-brand-green/10 text-brand-green font-semibold'
                          : 'text-brand-text'
                      }`}
                    >
                      <span className="font-semibold">{result.brand}</span>
                      <span className="text-gray-500">, {result.value}</span>
                    </button>
                  )
                }
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">Inga resultat hittades</div>
          )}
        </div>
      )}
    </div>
  )
}
