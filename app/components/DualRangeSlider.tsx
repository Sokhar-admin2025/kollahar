'use client'

import { useState, useEffect, useRef } from 'react'

interface DualRangeSliderProps {
  min: number
  max: number
  minValue: number
  maxValue: number
  onMinChange: (value: number) => void
  onMaxChange: (value: number) => void
  step?: number
  label?: string
  unit?: string
  className?: string
}

export default function DualRangeSlider({
  min,
  max,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  step = 1,
  label,
  unit = '',
  className = ''
}: DualRangeSliderProps) {
  const [localMin, setLocalMin] = useState(minValue)
  const [localMax, setLocalMax] = useState(maxValue)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalMin(minValue)
  }, [minValue])

  useEffect(() => {
    setLocalMax(maxValue)
  }, [maxValue])

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), localMax - step)
    setLocalMin(value)
    onMinChange(value)
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), localMin + step)
    setLocalMax(value)
    onMaxChange(value)
  }

  const minPercent = ((localMin - min) / (max - min)) * 100
  const maxPercent = ((localMax - min) / (max - min)) * 100

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
          {label}
        </label>
      )}
      <div className="relative py-4">
        <div
          ref={sliderRef}
          className="relative h-2 bg-gray-200 rounded-full"
        >
          <div
            className="absolute h-2 bg-brand-green rounded-full"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={localMin}
          onChange={handleMinChange}
          step={step}
          className="absolute top-0 w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localMax}
          onChange={handleMaxChange}
          step={step}
          className="absolute top-0 w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        />
        <div
          className="absolute top-0 w-4 h-4 bg-brand-green rounded-full border-2 border-white shadow-md cursor-pointer z-20 transform -translate-y-1"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />
        <div
          className="absolute top-0 w-4 h-4 bg-brand-green rounded-full border-2 border-white shadow-md cursor-pointer z-20 transform -translate-y-1"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span className="font-medium">{localMin.toLocaleString('sv-SE')}{unit}</span>
        <span className="font-medium">{localMax.toLocaleString('sv-SE')}{unit}</span>
      </div>
    </div>
  )
}
