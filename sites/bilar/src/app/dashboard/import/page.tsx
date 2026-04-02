'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setStatus('uploading')
    setMessage('')
    setErrors([])

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import-smistabil', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? `Fel: ${res.status}`)
        return
      }

      setStatus('done')
      setMessage(data.message ?? 'Import klar.')
      setErrors(Array.isArray(data.errors) ? data.errors : [])
      setFile(null)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Något gick fel.')
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
          Importera Smistabil CSV
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>
          Ladda upp en CSV-exportfil från Smistabil. Befintliga annonser uppdateras automatiskt
          baserat på annons-ID. Bilder hämtas och lagras internt.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            border: '2px dashed #E2E8F0',
            borderRadius: '10px',
            padding: '32px 24px',
            textAlign: 'center',
            background: '#F8FAFC',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('csv-file-input')?.click()}
        >
          <Upload size={28} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
          {file ? (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{file.name}</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                Klicka för att välja CSV-fil
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
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          type="submit"
          disabled={!file || status === 'uploading'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: !file || status === 'uploading' ? '#94A3B8' : '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: !file || status === 'uploading' ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <Upload size={16} />
          {status === 'uploading' ? 'Importerar…' : 'Importera'}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '8px',
            background: status === 'error' ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${status === 'error' ? '#FECACA' : '#BBF7D0'}`,
            color: status === 'error' ? '#991B1B' : '#166534',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {message}
          {errors.length > 0 && (
            <ul style={{ marginTop: '12px', paddingLeft: '20px', fontSize: '13px' }}>
              {errors.map((err, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
