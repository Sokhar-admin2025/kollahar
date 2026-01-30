'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { getModelsByMake, searchMakes, searchModels } from '@/lib/car-data'

interface CarMakeModelInputProps {
  make: string
  model: string
  onMakeChange: (make: string) => void
  onModelChange: (model: string) => void
  makeRequired?: boolean
  modelRequired?: boolean
}

export default function CarMakeModelInput({
  make,
  model,
  onMakeChange,
  onModelChange,
  makeRequired = false,
  modelRequired = false,
}: CarMakeModelInputProps) {
  const [makeQuery, setMakeQuery] = useState(make || '')
  const [modelQuery, setModelQuery] = useState(model || '')
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false)
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)

  const makeInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)
  const makeSuggestionsRef = useRef<HTMLDivElement>(null)
  const modelSuggestionsRef = useRef<HTMLDivElement>(null)

  // Beräkna tillgängliga modeller baserat på make
  const availableModels = useMemo(() => {
    return make ? getModelsByMake(make) : []
  }, [make])

  // Synka makeQuery när make ändras externt (endast om användaren inte skriver)
  const currentMakeQuery = make && !makeQuery ? make : makeQuery

  // Synka modelQuery när model ändras externt eller make ändras
  const currentModelQuery = useMemo(() => {
    if (!make) return ''
    if (model && !modelQuery) return model
    if (make && modelQuery && !availableModels.includes(modelQuery)) {
      // Rensa ogiltig modell
      setTimeout(() => {
        setModelQuery('')
        onModelChange('')
      }, 0)
      return ''
    }
    return modelQuery
  }, [make, model, modelQuery, availableModels, onModelChange])

  // Stäng vid klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        makeSuggestionsRef.current &&
        !makeSuggestionsRef.current.contains(event.target as Node) &&
        makeInputRef.current &&
        !makeInputRef.current.contains(event.target as Node)
      ) {
        setShowMakeSuggestions(false)
      }
      if (
        modelSuggestionsRef.current &&
        !modelSuggestionsRef.current.contains(event.target as Node) &&
        modelInputRef.current &&
        !modelInputRef.current.contains(event.target as Node)
      ) {
        setShowModelSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const makeSuggestions = currentMakeQuery ? searchMakes(currentMakeQuery) : []

  const modelSuggestions = currentModelQuery && make
    ? searchModels(currentModelQuery, make)
    : []

  const handleMakeSelect = (selectedMake: string) => {
    setMakeQuery(selectedMake)
    onMakeChange(selectedMake)
    setShowMakeSuggestions(false)
    if (makeInputRef.current) {
      makeInputRef.current.blur()
    }
  }

  const handleModelSelect = (selectedModel: string) => {
    setModelQuery(selectedModel)
    onModelChange(selectedModel)
    setShowModelSuggestions(false)
    if (modelInputRef.current) {
      modelInputRef.current.blur()
    }
  }

  return (
    <>
      <div className="relative">
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          Märke {makeRequired && <span className="text-red-500">*</span>}
        </label>
        <input
          ref={makeInputRef}
          type="text"
          required={makeRequired}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
          placeholder="T.ex. Volvo"
          value={currentMakeQuery}
          onChange={(e) => {
            const val = e.target.value
            setMakeQuery(val)
            setShowMakeSuggestions(true)
            if (!val) {
              onMakeChange('')
            }
          }}
          onFocus={() => {
            if (currentMakeQuery) {
              setShowMakeSuggestions(true)
            }
          }}
        />
        {showMakeSuggestions && makeSuggestions.length > 0 && (
          <div
            ref={makeSuggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
          >
            {makeSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleMakeSelect(suggestion)}
                className="w-full text-left px-4 py-2.5 hover:bg-brand-green/10 transition-colors border-b border-gray-50 last:border-b-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          Modell {modelRequired && <span className="text-red-500">*</span>}
        </label>
        <input
          ref={modelInputRef}
          type="text"
          required={modelRequired}
          disabled={!make}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={make ? "T.ex. XC60" : "Välj märke först"}
          value={currentModelQuery}
          onChange={(e) => {
            const val = e.target.value
            setModelQuery(val)
            setShowModelSuggestions(true)
            if (!val) {
              onModelChange('')
            }
          }}
          onFocus={() => {
            if (currentModelQuery && make) {
              setShowModelSuggestions(true)
            }
          }}
        />
        {showModelSuggestions && modelSuggestions.length > 0 && make && (
          <div
            ref={modelSuggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
          >
            {modelSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleModelSelect(suggestion)}
                className="w-full text-left px-4 py-2.5 hover:bg-brand-green/10 transition-colors border-b border-gray-50 last:border-b-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {make && availableModels.length > 0 && (
          <select
            className="w-full mt-2 p-2 border border-gray-300 rounded-lg bg-white text-brand-text text-sm"
            value={model}
            onChange={(e) => {
              const val = e.target.value
              onModelChange(val)
              setModelQuery(val)
            }}
          >
            <option value="">Välj modell från lista</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>
    </>
  )
}
