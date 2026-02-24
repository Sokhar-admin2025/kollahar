'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { CAR_BRANDS, getModelsByMake } from '@/lib/car-data'

interface CarMakeModelFieldsProps {
  make: string
  model: string
  onMakeChange: (make: string) => void
  onModelChange: (model: string) => void
  required?: boolean
  className?: string
}

export default function CarMakeModelFields({
  make,
  model,
  onMakeChange,
  onModelChange,
  required = false,
  className = ''
}: CarMakeModelFieldsProps) {
  const [makeQuery, setMakeQuery] = useState('')
  const [modelQuery, setModelQuery] = useState('')
  const [isMakeOpen, setIsMakeOpen] = useState(false)
  const [isModelOpen, setIsModelOpen] = useState(false)
  
  const makeContainerRef = useRef<HTMLDivElement>(null)
  const modelContainerRef = useRef<HTMLDivElement>(null)
  const makeInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  // Alla märken sorterade alfabetiskt
  const allMakes = useMemo(() => {
    return CAR_BRANDS.map(b => b.brand).sort()
  }, [])

  // Filtrerade modeller för valt märke, sorterade alfabetiskt
  const availableModels = useMemo(() => {
    if (!make) return []
    return getModelsByMake(make).sort()
  }, [make])

  // Smart parsing: Hantera "Volvo V70" eller "Volvo, V70"
  const parseMakeModelInput = (input: string): { make: string; model: string } | null => {
    const trimmed = input.trim()
    if (!trimmed) return null

    // Försök hitta matchning med komma: "Volvo, V70"
    const commaMatch = trimmed.match(/^(.+?),\s*(.+)$/)
    if (commaMatch) {
      const [, makePart, modelPart] = commaMatch
      const foundBrand = CAR_BRANDS.find(b => 
        b.brand.toLowerCase() === makePart.trim().toLowerCase()
      )
      if (foundBrand) {
        const foundModel = foundBrand.models.find(m => 
          m.toLowerCase() === modelPart.trim().toLowerCase()
        )
        if (foundModel) {
          return { make: foundBrand.brand, model: foundModel }
        }
      }
    }

    // Försök hitta matchning utan komma: "Volvo V70"
    for (const brand of CAR_BRANDS) {
      if (trimmed.toLowerCase().startsWith(brand.brand.toLowerCase())) {
        const remaining = trimmed.slice(brand.brand.length).trim()
        if (remaining) {
          const foundModel = brand.models.find(m => 
            m.toLowerCase() === remaining.toLowerCase()
          )
          if (foundModel) {
            return { make: brand.brand, model: foundModel }
          }
        }
      }
    }

    return null
  }

  // Sökresultat för märke med smart autoprediction
  const makeSuggestions = useMemo(() => {
    if (!makeQuery.trim()) {
      return allMakes
    }
    const lowerQuery = makeQuery.toLowerCase()
    
    // Först: Försök parse:a som märke+modell (t.ex. "Volvo V70" eller "Volvo, V70")
    const parsed = parseMakeModelInput(makeQuery)
    if (parsed) {
      // Om vi kan parse:a det, visa det som första förslag
      return [`${parsed.make}, ${parsed.model}`]
    }
    
    // Annars: Sök efter märken som matchar
    const matches = allMakes.filter(m => m.toLowerCase().includes(lowerQuery))
    
    // Om ≤3 matchningar, visa autoprediction
    if (matches.length <= 3 && matches.length > 0) {
      return matches
    }
    
    // Om fler än 3, visa de första 10
    return matches.slice(0, 10)
  }, [makeQuery, allMakes])

  // Sökresultat för modell (endast om märke är valt)
  const modelSuggestions = useMemo(() => {
    if (!make) {
      return []
    }
    if (!modelQuery.trim()) {
      return availableModels
    }
    const lowerQuery = modelQuery.toLowerCase()
    const matches = availableModels.filter(m => m.toLowerCase().includes(lowerQuery))
    
    // Om ≤3 matchningar, visa autoprediction
    if (matches.length <= 3 && matches.length > 0) {
      return matches
    }
    
    // Om fler än 3, visa de första 10
    return matches.slice(0, 10)
  }, [make, modelQuery, availableModels])

  // Hantera val av märke
  const handleMakeSelect = (selectedValue: string) => {
    // Om valet är "Märke, Modell"-format
    const parsed = parseMakeModelInput(selectedValue)
    if (parsed) {
      onMakeChange(parsed.make)
      onModelChange(parsed.model)
      setMakeQuery('')
      setModelQuery('')
      setIsMakeOpen(false)
      setIsModelOpen(false)
      return
    }

    // Annars är det bara ett märke
    onMakeChange(selectedValue)
    onModelChange('') // Rensa modell när märke ändras
    setMakeQuery('')
    setModelQuery('')
    setIsMakeOpen(false)
    // Öppna modell-fältet automatiskt
    setTimeout(() => {
      modelInputRef.current?.focus()
      setIsModelOpen(true)
    }, 100)
  }

  // Hantera val av modell
  const handleModelSelect = (selectedModel: string) => {
    onModelChange(selectedModel)
    setModelQuery('')
    setIsModelOpen(false)
  }

  // Hantera input i märke-fältet
  const handleMakeInputChange = (value: string) => {
    setMakeQuery(value)
    setIsMakeOpen(true)
    
    // Om användaren skriver något som kan parse:as som märke+modell
    const parsed = parseMakeModelInput(value)
    if (parsed && makeSuggestions.length <= 3) {
      // Visa autoprediction
    }
  }

  // Hantera input i modell-fältet
  const handleModelInputChange = (value: string) => {
    setModelQuery(value)
    setIsModelOpen(true)
  }

  // Rensa båda fälten
  const handleClear = () => {
    onMakeChange('')
    onModelChange('')
    setMakeQuery('')
    setModelQuery('')
    setIsMakeOpen(false)
    setIsModelOpen(false)
    makeInputRef.current?.focus()
  }

  // Stäng vid klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (makeContainerRef.current && !makeContainerRef.current.contains(event.target as Node)) {
        setIsMakeOpen(false)
        if (!make) setMakeQuery('')
      }
      if (modelContainerRef.current && !modelContainerRef.current.contains(event.target as Node)) {
        setIsModelOpen(false)
        if (!model) setModelQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [make, model])

  return (
    <div className={className}>
      {/* Märke-fält */}
      <div ref={makeContainerRef} className="relative">
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          Märke {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            ref={makeInputRef}
            type="text"
            value={isMakeOpen ? makeQuery : make}
            onChange={(e) => handleMakeInputChange(e.target.value)}
            onFocus={() => {
              setMakeQuery(make)
              setIsMakeOpen(true)
            }}
            placeholder="Sök eller välj märke..."
            required={required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-brand-text antialiased"
          />
          {make && !isMakeOpen && (
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
            onClick={() => setIsMakeOpen(!isMakeOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${isMakeOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isMakeOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {makeSuggestions.length > 0 ? (
              <div className="p-2">
                {makeSuggestions.map((suggestion) => {
                  const isCombined = suggestion.includes(',')
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleMakeSelect(suggestion)}
                      className={`w-full text-left px-4 py-2 hover:bg-brand-beige rounded-lg transition-colors ${
                        make === suggestion.split(',')[0] ? 'bg-brand-green/10 text-brand-green font-semibold' : 'text-brand-text'
                      }`}
                    >
                      {isCombined ? (
                        <>
                          <span className="font-semibold">{suggestion.split(',')[0]}</span>
                          <span className="text-gray-500">, {suggestion.split(',')[1]}</span>
                        </>
                      ) : (
                        <span className="font-semibold">{suggestion}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">Inga resultat hittades</div>
            )}
          </div>
        )}
      </div>

      {/* Modell-fält (synligt men disabled tills märke är valt) */}
      <div ref={modelContainerRef} className="relative ml-4 mt-4">
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          Modell {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            ref={modelInputRef}
            type="text"
            value={isModelOpen ? modelQuery : model}
            onChange={(e) => handleModelInputChange(e.target.value)}
            onFocus={() => {
              if (make) {
                setModelQuery(model)
                setIsModelOpen(true)
              }
            }}
            placeholder={make ? "Sök eller välj modell..." : "Välj märke först..."}
            required={required && !!make}
            disabled={!make}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-brand-text antialiased ${
              !make ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
            }`}
          />
          {model && !isModelOpen && make && (
            <button
              type="button"
              onClick={() => {
                onModelChange('')
                setModelQuery('')
              }}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Rensa modell"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {make && (
            <button
              type="button"
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {isModelOpen && make && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {modelSuggestions.length > 0 ? (
              <div className="p-2">
                {modelSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleModelSelect(suggestion)}
                    className={`w-full text-left px-4 py-2 hover:bg-brand-beige rounded-lg transition-colors ${
                      model === suggestion ? 'bg-brand-green/10 text-brand-green font-semibold' : 'text-brand-text'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">Inga modeller hittades</div>
            )}
          </div>
        )}

        {!make && (
          <p className="mt-1 text-xs text-gray-500 antialiased">
            Välj ett märke ovan först
          </p>
        )}
      </div>
    </div>
  )
}
