'use client'

import { useState, useEffect, useRef } from 'react'

interface BilarDualRangeSliderProps {
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

export default function BilarDualRangeSlider({
  min,
  max,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  step = 1,
  label,
  unit = '',
  className = '',
}: BilarDualRangeSliderProps) {
  const [localMin, setLocalMin] = useState(minValue)
  const [localMax, setLocalMax] = useState(maxValue)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalMin(minValue) }, [minValue])
  useEffect(() => { setLocalMax(maxValue) }, [maxValue])

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
        <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>
          {label}
        </p>
      )}
      <div className="relative py-4">
        <div ref={sliderRef} className="relative h-1.5 rounded-full" style={{ background: '#E2E8F0' }}>
          <div
            className="absolute h-1.5 rounded-full"
            style={{
              background: '#2563EB',
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
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
          className="absolute top-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer z-10"
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localMax}
          onChange={handleMaxChange}
          step={step}
          className="absolute top-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer z-10"
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
        />

        <div
          className="absolute top-0 w-4 h-4 rounded-full border-2 border-white shadow-md z-20"
          style={{
            background: '#2563EB',
            left: `calc(${minPercent}% - 8px)`,
            transform: 'translateY(-25%)',
          }}
        />
        <div
          className="absolute top-0 w-4 h-4 rounded-full border-2 border-white shadow-md z-20"
          style={{
            background: '#2563EB',
            left: `calc(${maxPercent}% - 8px)`,
            transform: 'translateY(-25%)',
          }}
        />
      </div>

      <div className="flex justify-between text-xs font-medium" style={{ color: '#64748B' }}>
        <span>{localMin.toLocaleString('sv-SE')}{unit}</span>
        <span>{localMax.toLocaleString('sv-SE')}{unit}</span>
      </div>
    </div>
  )
}
