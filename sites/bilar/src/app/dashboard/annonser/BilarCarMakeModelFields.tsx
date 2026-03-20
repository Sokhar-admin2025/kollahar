'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { CAR_BRANDS, getModelsByMake } from '../../../lib/car-data'

interface BilarCarMakeModelFieldsProps {
  make: string
  model: string
  onMakeChange: (make: string) => void
  onModelChange: (model: string) => void
  required?: boolean
}

export default function BilarCarMakeModelFields({
  make,
  model,
  onMakeChange,
  onModelChange,
  required = false,
}: BilarCarMakeModelFieldsProps) {
  const [makeQuery, setMakeQuery] = useState('')
  const [modelQuery, setModelQuery] = useState('')
  const [isMakeOpen, setIsMakeOpen] = useState(false)
  const [isModelOpen, setIsModelOpen] = useState(false)

  const makeContainerRef = useRef<HTMLDivElement>(null)
  const modelContainerRef = useRef<HTMLDivElement>(null)
  const makeInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const allMakes = useMemo(() => CAR_BRANDS.map(b => b.brand).sort(), [])

  const availableModels = useMemo(() => {
    if (!make) return []
    return getModelsByMake(make).sort()
  }, [make])

  const parseMakeModelInput = (input: string): { make: string; model: string } | null => {
    const trimmed = input.trim()
    if (!trimmed) return null

    const commaMatch = trimmed.match(/^(.+?),\s*(.+)$/)
    if (commaMatch) {
      const [, makePart, modelPart] = commaMatch
      const foundBrand = CAR_BRANDS.find(
        b => b.brand.toLowerCase() === makePart.trim().toLowerCase()
      )
      if (foundBrand) {
        const foundModel = foundBrand.models.find(
          m => m.toLowerCase() === modelPart.trim().toLowerCase()
        )
        if (foundModel) return { make: foundBrand.brand, model: foundModel }
      }
    }

    for (const brand of CAR_BRANDS) {
      if (trimmed.toLowerCase().startsWith(brand.brand.toLowerCase())) {
        const remaining = trimmed.slice(brand.brand.length).trim()
        if (remaining) {
          const foundModel = brand.models.find(
            m => m.toLowerCase() === remaining.toLowerCase()
          )
          if (foundModel) return { make: brand.brand, model: foundModel }
        }
      }
    }

    return null
  }

  const makeSuggestions = useMemo(() => {
    if (!makeQuery.trim()) return allMakes
    const lowerQuery = makeQuery.toLowerCase()
    const parsed = parseMakeModelInput(makeQuery)
    if (parsed) return [`${parsed.make}, ${parsed.model}`]
    const matches = allMakes.filter(m => m.toLowerCase().includes(lowerQuery))
    return matches.slice(0, 10)
  }, [makeQuery, allMakes]) // eslint-disable-line react-hooks/exhaustive-deps

  const modelSuggestions = useMemo(() => {
    if (!make) return []
    if (!modelQuery.trim()) return availableModels
    const lowerQuery = modelQuery.toLowerCase()
    return availableModels.filter(m => m.toLowerCase().includes(lowerQuery)).slice(0, 10)
  }, [make, modelQuery, availableModels])

  const handleMakeSelect = (selectedValue: string) => {
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
    onMakeChange(selectedValue)
    onModelChange('')
    setMakeQuery('')
    setModelQuery('')
    setIsMakeOpen(false)
    setTimeout(() => {
      modelInputRef.current?.focus()
      setIsModelOpen(true)
    }, 100)
  }

  const handleModelSelect = (selectedModel: string) => {
    onModelChange(selectedModel)
    setModelQuery('')
    setIsModelOpen(false)
  }

  const handleClear = () => {
    onMakeChange('')
    onModelChange('')
    setMakeQuery('')
    setModelQuery('')
    setIsMakeOpen(false)
    setIsModelOpen(false)
    makeInputRef.current?.focus()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        makeContainerRef.current &&
        !makeContainerRef.current.contains(event.target as Node)
      ) {
        setIsMakeOpen(false)
        if (!make) setMakeQuery('')
      }
      if (
        modelContainerRef.current &&
        !modelContainerRef.current.contains(event.target as Node)
      ) {
        setIsModelOpen(false)
        if (!model) setModelQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [make, model])

  const inputClass =
    'w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition'
  const inputActive = `${inputClass} border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE]`
  const inputDisabled = `${inputClass} border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed`

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Märke */}
      <div ref={makeContainerRef} className="relative">
        <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
          Märke {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
        <div className="relative">
          <input
            ref={makeInputRef}
            type="text"
            value={isMakeOpen ? makeQuery : make}
            onChange={(e) => {
              setMakeQuery(e.target.value)
              setIsMakeOpen(true)
            }}
            onFocus={() => {
              setMakeQuery(make)
              setIsMakeOpen(true)
            }}
            placeholder="Sök märke..."
            required={required}
            className={inputActive}
          />
          {make && !isMakeOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-8 top-1/2 -translate-y-1/2"
              style={{ color: '#94A3B8' }}
              aria-label="Rensa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMakeOpen(!isMakeOpen)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#94A3B8' }}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isMakeOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {isMakeOpen && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-56 overflow-y-auto"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
          >
            {makeSuggestions.length > 0 ? (
              <div className="p-1">
                {makeSuggestions.map((suggestion) => {
                  const isCombined = suggestion.includes(',')
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleMakeSelect(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition"
                      style={{
                        background:
                          make === suggestion.split(',')[0].trim() ? '#EFF6FF' : undefined,
                        color:
                          make === suggestion.split(',')[0].trim() ? '#2563EB' : '#0F172A',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background =
                          make === suggestion.split(',')[0].trim() ? '#EFF6FF' : ''
                      }}
                    >
                      {isCombined ? (
                        <>
                          <span className="font-semibold">{suggestion.split(',')[0]}</span>
                          <span style={{ color: '#64748B' }}>,{suggestion.split(',')[1]}</span>
                        </>
                      ) : (
                        <span className="font-medium">{suggestion}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="px-3 py-3 text-sm text-center" style={{ color: '#94A3B8' }}>
                Inga märken hittades
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modell */}
      <div ref={modelContainerRef} className="relative">
        <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
          Modell {required && make && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
        <div className="relative">
          <input
            ref={modelInputRef}
            type="text"
            value={isModelOpen ? modelQuery : model}
            onChange={(e) => {
              setModelQuery(e.target.value)
              setIsModelOpen(true)
            }}
            onFocus={() => {
              if (make) {
                setModelQuery(model)
                setIsModelOpen(true)
              }
            }}
            placeholder={make ? 'Sök modell...' : 'Välj märke först...'}
            disabled={!make}
            className={make ? inputActive : inputDisabled}
          />
          {model && !isModelOpen && make && (
            <button
              type="button"
              onClick={() => {
                onModelChange('')
                setModelQuery('')
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2"
              style={{ color: '#94A3B8' }}
              aria-label="Rensa modell"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {make && (
            <button
              type="button"
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: '#94A3B8' }}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isModelOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        {isModelOpen && make && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-56 overflow-y-auto"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
          >
            {modelSuggestions.length > 0 ? (
              <div className="p-1">
                {modelSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleModelSelect(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md transition"
                    style={{
                      background: model === suggestion ? '#EFF6FF' : undefined,
                      color: model === suggestion ? '#2563EB' : '#0F172A',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.background =
                        model === suggestion ? '#EFF6FF' : ''
                    }}
                  >
                    <span className="font-medium">{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-3 text-sm text-center" style={{ color: '#94A3B8' }}>
                Inga modeller hittades
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
