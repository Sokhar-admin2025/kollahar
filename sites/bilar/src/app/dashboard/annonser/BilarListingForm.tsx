'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, AlertCircle, ImageIcon, Plus, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { createClient } from '../../../lib/supabase/client'
import BilarCarMakeModelFields from './BilarCarMakeModelFields'
import BilarYearInput from './BilarYearInput'
import type { BilarListingDetail, BilarListingFormData } from '../../../lib/features/bilar-listings-service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BilarListingFormProps {
  organizationId: string
  userId: string
  listing?: BilarListingDetail // undefined = skapa ny
  submitAction: (
    data: BilarListingFormData
  ) => Promise<{ success: boolean; error?: string; id?: string }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TYPES = ['Bensin', 'Diesel', 'El', 'Hybrid', 'Laddhybrid', 'Gas', 'Vätgas']
const GEARBOX_TYPES = ['Manuell', 'Automat']
const BODY_TYPES = ['Sedan', 'Kombi', 'SUV', 'Cabriolet', 'Coupé', 'Minibuss', 'Pickup', 'Skåpbil', 'Halvkombi']
const CONDITIONS = ['Ny', 'Begagnad', 'Leasingåtertagare', 'Kampanjbil']
const MAX_IMAGES = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoTitle(make: string, model: string, year: string): string {
  const parts = [make, model, year].filter(Boolean)
  return parts.join(' ')
}

function formatNumber(value: string): string {
  return value.replace(/\D/g, '')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BilarListingForm({
  organizationId,
  userId,
  listing,
  submitAction,
}: BilarListingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const equipmentInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const attrs = listing?.attributes ?? {}

  // ─── Form state ───────────────────────────────────────────────────────────
  const [images, setImages] = useState<string[]>(listing?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [make, setMake] = useState(listing?.make ?? '')
  const [model, setModel] = useState(listing?.model ?? '')
  const [year, setYear] = useState(listing?.year ? String(listing.year) : '')
  const [titleManual, setTitleManual] = useState(!!listing?.title)
  const [title, setTitle] = useState(listing?.title ?? '')
  const [price, setPrice] = useState(listing?.price ? String(listing.price) : '')
  const [mileage, setMileage] = useState(attrs.mileage ? String(attrs.mileage) : '')
  const [fuelType, setFuelType] = useState(attrs.fuel_type ?? '')
  const [gearbox, setGearbox] = useState(attrs.gearbox ?? '')
  const [bodyType, setBodyType] = useState(attrs.body_type ?? '')
  const [color, setColor] = useState(attrs.color ?? '')
  const [condition, setCondition] = useState(attrs.condition ?? '')
  const [inspectionDate, setInspectionDate] = useState(attrs.inspection_valid_until ?? '')
  const [downPayment, setDownPayment] = useState(attrs.down_payment ? String(attrs.down_payment) : '')
  const [isUpcoming, setIsUpcoming] = useState(attrs.is_upcoming ?? false)
  const [description, setDescription] = useState(attrs.description ?? '')
  const [equipment, setEquipment] = useState<string[]>(attrs.equipment ?? [])
  const [equipmentInput, setEquipmentInput] = useState('')
  const [contactViaChat, setContactViaChat] = useState(listing?.contact_via_chat ?? true)
  const [showPhone, setShowPhone] = useState(listing?.show_phone ?? false)
  const [contactPhone, setContactPhone] = useState(listing?.contact_phone ?? '')
  const [showEmail, setShowEmail] = useState(listing?.show_email ?? false)
  const [status, setStatus] = useState<'active' | 'draft'>(
    (listing?.status === 'active' || listing?.status === 'draft') ? listing.status : 'draft'
  )

  // Auto-generera titel
  const derivedTitle = autoTitle(make, model, year)
  const displayTitle = titleManual ? title : derivedTitle

  const handleMakeChange = (v: string) => {
    setMake(v)
    if (!titleManual) setTitle('')
  }
  const handleModelChange = (v: string) => {
    setModel(v)
    if (!titleManual) setTitle('')
  }
  const handleYearChange = (v: string) => {
    setYear(v)
    if (!titleManual) setTitle('')
  }

  // ─── Bilduppladdning ──────────────────────────────────────────────────────
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (images.length >= MAX_IMAGES) {
      setError(`Max ${MAX_IMAGES} bilder tillåtna.`)
      return
    }

    setUploading(true)
    setError(null)
    const supabase = createClient()

    const remaining = MAX_IMAGES - images.length
    const toUpload = Array.from(files).slice(0, remaining)
    const uploaded: string[] = []

    for (const file of toUpload) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        const ext = file.name.split('.').pop() ?? 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const path = `${userId}/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, compressed)

        if (uploadError) {
          console.error('Bilduppladdningsfel:', uploadError)
          continue
        }

        const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path)
        if (urlData?.publicUrl) {
          uploaded.push(urlData.publicUrl)
        }
      } catch (err) {
        console.error('Komprimeringfel:', err)
      }
    }

    setImages((prev) => [...prev, ...uploaded])
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const moveImage = (from: number, to: number) => {
    setImages((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  // ─── Utrustningschips ─────────────────────────────────────────────────────
  const addEquipment = () => {
    const tag = equipmentInput.trim()
    if (tag && !equipment.includes(tag)) {
      setEquipment((prev) => [...prev, tag])
    }
    setEquipmentInput('')
  }

  const removeEquipment = (tag: string) => {
    setEquipment((prev) => prev.filter((t) => t !== tag))
  }

  // ─── Validering ───────────────────────────────────────────────────────────
  const atLeastOneChannel = contactViaChat || showPhone || showEmail

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!atLeastOneChannel) {
      setError('Minst en kontaktkanal måste vara aktiv.')
      return
    }

    const finalTitle = titleManual ? title.trim() : derivedTitle
    if (!finalTitle) {
      setError('Titel krävs — fyll i märke, modell och år eller skriv en rubrik manuellt.')
      return
    }

    const data: BilarListingFormData = {
      title: finalTitle,
      make,
      model,
      year: year ? parseInt(year, 10) : null,
      price: price ? parseInt(formatNumber(price), 10) : null,
      status,
      images,
      contact_via_chat: contactViaChat,
      show_phone: showPhone,
      contact_phone: showPhone ? contactPhone : '',
      show_email: showEmail,
      attributes: {
        mileage: mileage ? parseInt(formatNumber(mileage), 10) : undefined,
        fuel_type: fuelType || undefined,
        gearbox: gearbox || undefined,
        color: color.trim() || undefined,
        body_type: bodyType || undefined,
        condition: condition || undefined,
        inspection_valid_until: inspectionDate || undefined,
        down_payment: downPayment ? parseInt(formatNumber(downPayment), 10) : undefined,
        is_upcoming: isUpcoming || undefined,
        equipment: equipment.length > 0 ? equipment : undefined,
        description: description.trim() || undefined,
      },
    }

    startTransition(async () => {
      const result = await submitAction(data)
      if (!result.success) {
        setError(result.error ?? 'Något gick fel.')
        return
      }
      router.push('/dashboard/annonser')
    })
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const inputClass =
    'w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE]'
  const selectClass = `${inputClass} bg-white appearance-none`
  const labelClass = 'block text-xs font-medium mb-1'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Bilder ─────────────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
          Bilder <span className="font-normal" style={{ color: '#94A3B8' }}>({images.length}/{MAX_IMAGES})</span>
        </h2>

        {/* Bildgrid */}
        {images.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mb-3">
            {images.map((url, i) => (
              <div key={url} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-[#F8FAFC]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span
                    className="absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: '#2563EB', color: '#FFFFFF' }}
                  >
                    Huvudbild
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(i, i - 1)}
                      className="rounded p-1 text-white text-xs"
                      style={{ background: 'rgba(255,255,255,0.2)' }}
                      title="Flytta vänster"
                    >
                      ←
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="rounded p-1"
                    style={{ background: 'rgba(239,68,68,0.8)' }}
                    title="Ta bort"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {i < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImage(i, i + 1)}
                      className="rounded p-1 text-white text-xs"
                      style={{ background: 'rgba(255,255,255,0.2)' }}
                      title="Flytta höger"
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ladda upp-knapp */}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition disabled:opacity-50"
            style={{ borderColor: '#E2E8F0', color: '#64748B', background: '#F8FAFC' }}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Laddar upp...' : 'Lägg till bilder'}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageFiles(e.target.files)}
        />

        {images.length === 0 && !uploading && (
          <div
            className="mt-3 flex flex-col items-center justify-center rounded-lg py-8 cursor-pointer"
            style={{ border: '1.5px dashed #E2E8F0' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-8 h-8 mb-2" style={{ color: '#CBD5E1' }} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              Klicka för att lägga till bilder
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#CBD5E1' }}>
              Max {MAX_IMAGES} bilder • Komprimeras automatiskt
            </p>
          </div>
        )}
      </section>

      {/* ── Grundinfo ──────────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
          Grundinformation
        </h2>

        {/* Märke + Modell */}
        <div className="mb-4">
          <BilarCarMakeModelFields
            make={make}
            model={model}
            onMakeChange={handleMakeChange}
            onModelChange={handleModelChange}
            required
          />
        </div>

        {/* År + Pris */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <BilarYearInput value={year} onChange={handleYearChange} required />

          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>
              Pris (SEK inkl. moms)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(formatNumber(e.target.value))}
              placeholder="T.ex. 299000"
              className={inputClass}
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          </div>
        </div>

        {/* Titel */}
        <div>
          <label className={labelClass} style={{ color: '#64748B' }}>
            Annonsrubrik
            {!titleManual && derivedTitle && (
              <span className="ml-2 font-normal" style={{ color: '#94A3B8' }}>
                (auto-genererad)
              </span>
            )}
          </label>
          <input
            type="text"
            value={displayTitle}
            onChange={(e) => {
              setTitleManual(true)
              setTitle(e.target.value)
            }}
            onFocus={() => {
              if (!titleManual && derivedTitle) {
                setTitleManual(true)
                setTitle(derivedTitle)
              }
            }}
            placeholder="T.ex. Volvo XC60 2021 — Välutrustad"
            required
            maxLength={120}
            className={inputClass}
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          {titleManual && (
            <button
              type="button"
              onClick={() => {
                setTitleManual(false)
                setTitle('')
              }}
              className="mt-1 text-xs"
              style={{ color: '#2563EB' }}
            >
              Återställ till auto-genererad
            </button>
          )}
        </div>
      </section>

      {/* ── Specifikationer ────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
          Specifikationer
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Miltal */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Miltal (km)</label>
            <input
              type="text"
              inputMode="numeric"
              value={mileage}
              onChange={(e) => setMileage(formatNumber(e.target.value))}
              placeholder="T.ex. 45000"
              className={inputClass}
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          </div>

          {/* Drivmedel */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Drivmedel</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className={selectClass}
              style={{ borderColor: '#E2E8F0', color: fuelType ? '#0F172A' : '#94A3B8' }}
            >
              <option value="">Välj drivmedel</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Växellåda */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Växellåda</label>
            <select
              value={gearbox}
              onChange={(e) => setGearbox(e.target.value)}
              className={selectClass}
              style={{ borderColor: '#E2E8F0', color: gearbox ? '#0F172A' : '#94A3B8' }}
            >
              <option value="">Välj växellåda</option>
              {GEARBOX_TYPES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Karosseri */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Karosseri</label>
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className={selectClass}
              style={{ borderColor: '#E2E8F0', color: bodyType ? '#0F172A' : '#94A3B8' }}
            >
              <option value="">Välj karosseri</option>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Färg */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Färg</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="T.ex. Svart metallisk"
              className={inputClass}
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          </div>

          {/* Skick */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Skick</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className={selectClass}
              style={{ borderColor: '#E2E8F0', color: condition ? '#0F172A' : '#94A3B8' }}
            >
              <option value="">Välj skick</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Besiktning */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Besiktning giltig till</label>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className={inputClass}
              style={{ borderColor: '#E2E8F0', color: inspectionDate ? '#0F172A' : '#94A3B8' }}
            />
          </div>

          {/* Handpenning */}
          <div>
            <label className={labelClass} style={{ color: '#64748B' }}>Handpenning (SEK)</label>
            <input
              type="text"
              inputMode="numeric"
              value={downPayment}
              onChange={(e) => setDownPayment(formatNumber(e.target.value))}
              placeholder="T.ex. 30000"
              className={inputClass}
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          </div>
        </div>

        {/* Kommande bil */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isUpcoming}
            onChange={(e) => setIsUpcoming(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: '#2563EB' }}
          />
          <span className="text-sm" style={{ color: '#0F172A' }}>
            Markera som kommande bil (visas med badge på annonsen)
          </span>
        </label>
      </section>

      {/* ── Beskrivning ────────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
          Beskrivning
        </h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beskriv bilen — skick, historia, utrustning, körupplevelse..."
          rows={5}
          className={`${inputClass} resize-y`}
          style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
        />
      </section>

      {/* ── Utrustning ─────────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
          Utrustning
        </h2>

        <div className="flex gap-2 mb-3">
          <input
            ref={equipmentInputRef}
            type="text"
            value={equipmentInput}
            onChange={(e) => setEquipmentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addEquipment()
              }
            }}
            placeholder="T.ex. Dragkrok, Backkamera..."
            className={`${inputClass} flex-1`}
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <button
            type="button"
            onClick={addEquipment}
            className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition"
            style={{ background: '#EFF6FF', color: '#2563EB' }}
          >
            <Plus className="w-4 h-4" />
            Lägg till
          </button>
        </div>

        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {equipment.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: '#F1F5F9', color: '#0F172A' }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeEquipment(tag)}
                  aria-label={`Ta bort ${tag}`}
                >
                  <X className="w-3 h-3" style={{ color: '#64748B' }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Kontaktkanaler ─────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
          Kontaktkanaler
        </h2>
        <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>
          Minst en kanal måste vara aktiv.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={contactViaChat}
              onChange={(e) => setContactViaChat(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#2563EB' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                Chatt via plattformen
              </p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                Köpare kan kontakta er direkt via LeadOS
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPhone}
              onChange={(e) => setShowPhone(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#2563EB' }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                Visa telefonnummer
              </p>
            </div>
          </label>

          {showPhone && (
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="T.ex. 08-123 45 67"
              className={`${inputClass} ml-7`}
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          )}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#2563EB' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                Visa e-postadress
              </p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                Organisationens e-post visas på annonsen
              </p>
            </div>
          </label>
        </div>

        {!atLeastOneChannel && (
          <p className="mt-3 text-xs" style={{ color: '#EF4444' }}>
            Du måste ha minst en kontaktkanal aktiv.
          </p>
        )}
      </section>

      {/* ── Status & Spara ─────────────────────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
          Publicering
        </h2>

        <div className="flex gap-3 mb-5">
          <button
            type="button"
            onClick={() => setStatus('draft')}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition"
            style={{
              background: status === 'draft' ? '#F8FAFC' : '#FFFFFF',
              borderColor: status === 'draft' ? '#2563EB' : '#E2E8F0',
              color: status === 'draft' ? '#2563EB' : '#64748B',
            }}
          >
            Spara som utkast
          </button>
          <button
            type="button"
            onClick={() => setStatus('active')}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition"
            style={{
              background: status === 'active' ? '#EFF6FF' : '#FFFFFF',
              borderColor: status === 'active' ? '#2563EB' : '#E2E8F0',
              color: status === 'active' ? '#2563EB' : '#64748B',
            }}
          >
            Publicera direkt
          </button>
        </div>

        {error && (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg px-3 py-2.5"
            style={{ background: '#FEF2F2' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <p className="text-xs" style={{ color: '#EF4444' }}>
              {error}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border transition disabled:opacity-50"
            style={{ borderColor: '#E2E8F0', color: '#64748B' }}
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={isPending || uploading || !atLeastOneChannel}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: '#2563EB' }}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sparar...
              </>
            ) : listing ? (
              'Spara ändringar'
            ) : (
              'Skapa annons'
            )}
          </button>
        </div>
      </section>
    </form>
  )
}
