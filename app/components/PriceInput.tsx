'use client'

import { useState } from 'react'
import { formatPrice, parsePrice } from '@/lib/features/listings/price-utils'

interface PriceInputProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  options: number[]
  placeholder?: string
}

export default function PriceInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: PriceInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const displayValue = isEditing
    ? inputValue
    : typeof value === 'number'
      ? formatPrice(value)
      : ''

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)
    const parsed = parsePrice(raw)
    onChange(parsed)
  }

  const handleOptionClick = (price: number) => {
    onChange(price)
    setInputValue('')
    setIsEditing(false)
    setIsOpen(false)
  }

  const handleBlur = () => {
    // Fördröj stängning så att klick på förslag hinner registreras
    setTimeout(() => setIsOpen(false), 100)
    setIsEditing(false)
    setInputValue('')
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-brand-text mb-1 antialiased">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => {
          setIsEditing(true)
          setInputValue(typeof value === 'number' ? formatPrice(value) : '')
          setIsOpen(true)
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased placeholder:text-gray-400"
      />
      {isOpen && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          <ul className="py-1">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-brand-text hover:bg-brand-beige/60"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleOptionClick(opt)}
                >
                  {formatPrice(opt)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

