'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

// Cirkelindikator — radius 28, circumference ≈ 175.9
const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ProgressCircle({ progress }: { progress: number }) {
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE
  return (
    <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
      {/* Spår */}
      <circle
        cx="36"
        cy="36"
        r={RADIUS}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth="5"
      />
      {/* Framsteg */}
      <circle
        cx="36"
        cy="36"
        r={RADIUS}
        fill="none"
        stroke="#2563EB"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  )
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errors, setErrors] = useState<string[]>([])
  // Simulerad framstegsprocent (API:et ger ingen ström — vi animerar till 90% och hoppar till 100 vid klart)
  const [progress, setProgress] = useState(0)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [])

  const startProgressSimulation = () => {
    setProgress(0)
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) {
          clearInterval(progressInterval.current!)
          return 88
        }
        return prev + Math.random() * 4 + 1
      })
    }, 400)
  }

  const finishProgress = () => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    setProgress(100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setErrors([])
    startProgressSimulation()

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import-smistabil', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      finishProgress()

      if (!res.ok) {
        setStatus('error')
        toast.error(data.error ?? `Import misslyckades (${res.status})`)
        return
      }

      setStatus('done')
      setFile(null)
      const errs: string[] = Array.isArray(data.errors) ? data.errors : []
      setErrors(errs)
      toast.success('Importen lyckades! Ditt lager är nu uppdaterat.')
    } catch (err) {
      finishProgress()
      setStatus('error')
      toast.error(err instanceof Error ? err.message : 'Något gick fel.')
    }
  }

  const isUploading = status === 'uploading'
  const isDone = status === 'done'

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
          Importera lager
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>
          Ladda upp din lagerfil i CSV-format. Systemet matchar automatiskt dina fordon och
          uppdaterar priser, beskrivningar och bilder.
        </p>
      </div>

      {/* Kolumnguide */}
      <div
        style={{
          marginBottom: '24px',
          padding: '14px 16px',
          borderRadius: '8px',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
        }}
      >
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#0369A1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Förväntade kolumner i CSV-filen
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          {[
            ['Registration_Number', 'Registreringsnummer'],
            ['Car_Name / name', 'Fordonsnamn (titel)'],
            ['Car_Make', 'Märke'],
            ['Car_Model', 'Modell'],
            ['Year', 'Årsmodell'],
            ['Car_Price / price', 'Pris (inkl. moms)'],
            ['Mileage', 'Miltal'],
            ['Fuel', 'Drivmedel'],
            ['Gearbox', 'Växellåda'],
            ['Horse_Power', 'Hästkrafter'],
            ['Color', 'Färg'],
            ['Image_*', 'Bild-URL:er (en per kolumn)'],
            ['Equipment_List', 'Utrustningslista (fritext)'],
          ].map(([col, label]) => (
            <div key={col} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
              <code style={{ fontSize: '11px', color: '#0369A1', background: '#E0F2FE', padding: '1px 5px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                {col}
              </code>
              <span style={{ fontSize: '12px', color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Filval */}
        <div
          style={{
            border: `2px dashed ${file ? '#2563EB' : '#E2E8F0'}`,
            borderRadius: '10px',
            padding: '32px 24px',
            textAlign: 'center',
            background: file ? '#EFF6FF' : '#F8FAFC',
            marginBottom: '20px',
            cursor: isUploading ? 'default' : 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => !isUploading && document.getElementById('csv-file-input')?.click()}
        >
          <Upload size={28} style={{ color: file ? '#2563EB' : '#94A3B8', margin: '0 auto 12px' }} />
          {file ? (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D4ED8' }}>{file.name}</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                Välj fil från ditt affärssystem
              </p>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                .csv eller .txt, max 10 MB
              </p>
            </div>
          )}
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            disabled={isUploading}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setStatus('idle')
              setErrors([])
            }}
          />
        </div>

        {/* Importera-knapp / Pågår-vy */}
        {isUploading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
              <ProgressCircle progress={progress} />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                }}
              >
                {Math.round(progress)}%
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
              Importerar fordon och optimerar bilder…
            </p>
          </div>
        ) : isDone ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={22} style={{ color: '#16A34A', flexShrink: 0 }} />
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#166534' }}>
              Importen är klar.
            </p>
            <button
              type="button"
              onClick={() => { setStatus('idle'); setErrors([]) }}
              style={{
                marginLeft: 'auto',
                fontSize: '13px',
                color: '#2563EB',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Importera igen
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!file}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: !file ? '#94A3B8' : '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: !file ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <Upload size={16} />
            Importera
          </button>
        )}
      </form>

      {/* Felrapport */}
      {errors.length > 0 && (
        <div
          style={{
            marginTop: '28px',
            padding: '16px',
            borderRadius: '8px',
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#9A3412', marginBottom: '10px' }}>
            {errors.length} {errors.length === 1 ? 'rad' : 'rader'} gick inte igenom
          </p>
          <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#7C2D12', lineHeight: '1.6' }}>
            {errors.map((err, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
