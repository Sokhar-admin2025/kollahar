'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import imageCompression from 'browser-image-compression'

import { DASHBOARD_TEXTS } from '../lib/content'
import Button from './atoms/Button'
import LocationInput from './LocationInput'
import type { Listing } from '../types'
import { CATEGORY_GROUPS } from '@/lib/categories'
import CarMakeModelInput from './CarMakeModelInput'
import YearInput from './YearInput'
import { CAR_COLORS } from '@/lib/car-colors'

interface CreateListingFormProps {
  initialData?: Listing
  onSuccess?: () => void
}

export default function CreateListingForm({ initialData, onSuccess }: CreateListingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const isEditMode = !!initialData
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [regNr, setRegNr] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [fuel, setFuel] = useState('')
  const [gearbox, setGearbox] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [color, setColor] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // Ref för att hålla koll på preview URLs för cleanup
  const previewUrlsRef = useRef<string[]>([])
  previewUrlsRef.current = imagePreviews

  const t = DASHBOARD_TEXTS.create
  const conditionOptions = ['Ny', 'Som ny', 'Bra', 'Använd', 'Defekt']
  const fuelOptions = ['Bensin', 'Diesel', 'El', 'Hybrid']
  const gearboxOptions = ['Manuell', 'Automat']
  const bodyTypeOptions = ['Kombi', 'Sedan', 'SUV', 'Halvkombi', 'Cab']
  const isCarsCategory = category === 'cars'

  // Fyll i formuläret med initialData om det finns (edit mode)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setPrice(initialData.price.toString())
      setLocation(initialData.location)
      setCategory(initialData.category || '')
      setExistingImageUrls(initialData.images || [])
      const attributes = initialData.attributes || {}
      // Type-safe access to attributes with fallback to empty string
      setCondition(typeof attributes.condition === 'string' ? attributes.condition : '')
      setRegNr(typeof attributes.reg_nr === 'string' ? attributes.reg_nr : '')
      setMake(typeof attributes.make === 'string' ? attributes.make : '')
      setModel(typeof attributes.model === 'string' ? attributes.model : '')
      setFuel(typeof attributes.fuel === 'string' ? attributes.fuel : '')
      setGearbox(typeof attributes.gearbox === 'string' ? attributes.gearbox : '')
      setYear(attributes.year ? String(attributes.year) : '')
      setMileage(attributes.mileage ? String(attributes.mileage) : '')
      setBodyType(typeof attributes.body_type === 'string' ? attributes.body_type : '')
      setColor(typeof attributes.color === 'string' ? attributes.color : '')
    }
  }, [initialData])

  useEffect(() => {
    if (isCarsCategory) return
    setRegNr('')
    setMake('')
    setModel('')
    setFuel('')
    setGearbox('')
    setYear('')
    setMileage('')
    setBodyType('')
    setColor('')
  }, [isCarsCategory])

  // Förifyll plats med användarens profil-location när man skapar ny annons
  useEffect(() => {
    const prefillLocationFromProfile = async () => {
      if (isEditMode || location) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('location')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.location) {
          const rawLocation = profile.location as string
          const looksLikeEmail = /\S+@\S+\.\S+/.test(rawLocation)
          if (!looksLikeEmail) {
            setLocation(rawLocation)
          }
        }
      } catch (error) {
        console.error('Kunde inte förifylla plats från profil:', error)
      }
    }

    prefillLocationFromProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  // Cleanup: Rensa preview URLs när komponenten unmountas
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(previewUrl => {
        URL.revokeObjectURL(previewUrl)
      })
    }
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return

      const totalImages = existingImageUrls.length + imagePreviews.length
      if (totalImages >= 15) {
        alert(t.form.image.errorTooMany)
        return 
      }

      const file = e.target.files[0]

      // Komprimera bilden innan vi sparar den
      setCompressing(true)
      let compressedFile: File

      try {
        const options = {
          maxSizeMB: 1.0,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        }

        compressedFile = await imageCompression(file, options)
      } catch (compressionError) {
        console.warn('Bildkomprimering misslyckades, försöker med originalfil:', compressionError)
        // Om komprimering misslyckas, försök med originalfilen
        compressedFile = file
      } finally {
        setCompressing(false)
      }

      // Kontrollera storlek efter komprimering
      if (compressedFile.size > 2 * 1024 * 1024) {
        alert(t.form.image.errorTooBig)
        return 
      }

      const previewUrl = URL.createObjectURL(compressedFile)
      setImageFiles([...imageFiles, compressedFile])
      setImagePreviews([...imagePreviews, previewUrl])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      alert('Fel vid uppladdning: ' + message)
      setCompressing(false)
    }
  }

  const removeImage = (indexToRemove: number, isExisting: boolean) => {
    if (isExisting) {
      // Ta bort från befintliga bilder
      setExistingImageUrls(existingImageUrls.filter((_, index) => index !== indexToRemove))
    } else {
      // Ta bort från nya previews
      const previewToRemove = imagePreviews[indexToRemove]
      if (previewToRemove) URL.revokeObjectURL(previewToRemove)
      setImageFiles(imageFiles.filter((_, index) => index !== indexToRemove))
      setImagePreviews(imagePreviews.filter((_, index) => index !== indexToRemove))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Du verkar ha blivit utloggad. Försök logga in igen.')
        router.push('/login')
        return
      }

      // Verifiera ägare vid redigering
      if (isEditMode && initialData?.user_id !== user.id) {
        alert('Du har inte behörighet att redigera denna annons.')
        router.push('/dashboard')
        return
      }

      // Validera pris
      const priceNum = parseInt(price)
      if (isNaN(priceNum) || priceNum < 0) {
        alert('Ogiltigt pris. Ange ett positivt heltal.')
        setLoading(false)
        return
      }

      if (!category) {
        alert('Välj en underkategori.')
        setLoading(false)
        return
      }

      if (!condition) {
        alert('Välj skick.')
        setLoading(false)
        return
      }

      const attributes: Record<string, unknown> = {
        condition,
      }

      if (isCarsCategory) {
        // Obligatoriska: make, model, fuel
        if (!make || !model || !fuel) {
          alert('Fyll i alla obligatoriska bilfält (Märke, Modell, Bränsle).')
          setLoading(false)
          return
        }

        // Validera år om det är ifyllt
        if (year) {
          const yearNum = parseInt(year)
          if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
            alert('Ogiltigt årsmodell.')
            setLoading(false)
            return
          }
          attributes.year = yearNum
        }

        // Validera miltal om det är ifyllt
        if (mileage) {
          const mileageNum = parseInt(mileage)
          if (isNaN(mileageNum) || mileageNum < 0) {
            alert('Ogiltigt miltal.')
            setLoading(false)
            return
          }
          attributes.mileage = mileageNum
        }

        // Spara alla fält (obligatoriska + valfria)
        if (regNr) attributes.reg_nr = regNr.trim()
        attributes.make = make.trim()
        attributes.model = model.trim()
        attributes.fuel = fuel
        if (gearbox) attributes.gearbox = gearbox
        if (bodyType) attributes.body_type = bodyType
        if (color) attributes.color = color.trim()
      }

      setUploading(true)

      // Ladda upp nya bilder
      const uploadedImageUrls: string[] = []
      
      if (imageFiles.length > 0) {
        try {
          const uploadResults = await Promise.all(
            imageFiles.map(async (file) => {
              const fileExt = file.name.split('.').pop()
              const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
              const filePath = `${user.id}/${fileName}`

              const { error: uploadError } = await supabase.storage
                .from('listing-images')
                .upload(filePath, file)

              if (uploadError) throw uploadError

              const { data } = supabase.storage
                .from('listing-images')
                .getPublicUrl(filePath)

              return data.publicUrl
            })
          )
          
          uploadedImageUrls.push(...uploadResults)
        } catch (uploadError: unknown) {
          const message = uploadError instanceof Error ? uploadError.message : 'Okänt fel'
          // Om uppladdning misslyckas, kasta fel
          throw new Error(`Bilduppladdning misslyckades: ${message}`)
        }
      }

      // Kombinera befintliga och nya bilder
      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls]

      if (isEditMode && initialData) {
        // UPDATE operation
        const { error } = await supabase
          .from('listings')
          .update({
            title,
            description,
            price: priceNum,
            location,
            category,
            attributes,
            images: allImageUrls,
          })
          .eq('id', initialData.id)
          .eq('user_id', user.id) // Extra säkerhetskontroll

        if (error) throw error

        router.push('/dashboard')
        router.refresh()
      } else {
        // INSERT operation
        const { error } = await supabase
          .from('listings')
          .insert({
            title,
            description,
            price: priceNum,
            location,
            category,
            attributes,
            images: allImageUrls,
            user_id: user.id,
            status: 'active'
          })

        if (error) throw error

        router.push('/dashboard')
        router.refresh()
      }

      if (onSuccess) {
        onSuccess()
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      console.error('Error saving listing:', error)
      alert(`Kunde inte ${isEditMode ? 'uppdatera' : 'skapa'} annons: ${message}`)
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const allImages = [...existingImageUrls, ...imagePreviews]
  const totalImages = allImages.length

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
      
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          {t.form.title.label}
        </label>
        <input
          type="text"
          required
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
          placeholder={t.form.title.placeholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          Vad ska du sälja? <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="" disabled>Välj underkategori</option>
          {CATEGORY_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.children.map((child) => (
                <option key={child.id} value={child.id}>{child.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          Skick <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          required
        >
          <option value="" disabled>Välj skick</option>
          {conditionOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
            {t.form.price.label} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder={t.form.price.placeholder}
            value={price}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setPrice(val)
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
            {t.form.location.label} <span className="text-red-500">*</span>
          </label>
          <LocationInput
            value={location}
            onChange={setLocation}
            placeholder={t.form.location.placeholder}
            required
          />
        </div>
      </div>

      {isCarsCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Regnr
            </label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
              value={regNr}
              onChange={(e) => setRegNr(e.target.value)}
            />
          </div>
          
          <CarMakeModelInput
            make={make}
            model={model}
            onMakeChange={setMake}
            onModelChange={setModel}
            makeRequired={true}
            modelRequired={true}
          />

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Bränsle <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              required
            >
              <option value="" disabled>Välj bränsle</option>
              {fuelOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Växellåda
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
              value={gearbox}
              onChange={(e) => setGearbox(e.target.value)}
            >
              <option value="">Välj växellåda</option>
              {gearboxOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <YearInput
            value={year}
            onChange={setYear}
            required={false}
          />

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Miltal
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="T.ex. 50000"
              value={mileage}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setMileage(val)
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Kaross
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
            >
              <option value="">Välj kaross</option>
              {bodyTypeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Färg
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="">Välj färg</option>
              {CAR_COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          {t.form.description.label} <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
          placeholder={t.form.description.placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t.form.image.label}
          </label>
          <span className="text-xs text-brand-text antialiased">
            {totalImages}/15 bilder
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-3">
          {/* Visa befintliga bilder först */}
          {existingImageUrls.map((url, index) => (
            <div key={`existing-${index}`} className="w-24 h-24 relative rounded-lg overflow-hidden border border-gray-200 group">
              <img src={url} alt="Befintlig bild" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index, true)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
            </div>
          ))}
          
          {/* Visa nya previews */}
          {imagePreviews.map((url, index) => (
            <div key={`preview-${index}`} className="w-24 h-24 relative rounded-lg overflow-hidden border border-gray-200 group">
              <img src={url} alt="Ny uppladdad" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index, false)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
            </div>
          ))}
          
          {/* Ladda upp ny bild */}
          {totalImages < 15 && (
            <label className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-brand-beige hover:border-brand-green transition ${uploading || compressing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-2xl text-brand-text">+</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={uploading || compressing}
                className="hidden" 
              />
            </label>
          )}
        </div>
        {compressing && <p className="text-sm text-brand-green animate-pulse">Bearbetar bild...</p>}
        {uploading && <p className="text-sm text-brand-green animate-pulse">{t.form.image.uploading}</p>}
      </div>

      <hr className="border-gray-100" />

      <div className="pt-2">
        <Button 
          type="submit" 
          variant="primary" 
          className="w-full py-4 text-lg font-bold"
          disabled={loading || uploading}
        >
          {loading 
            ? (isEditMode ? DASHBOARD_TEXTS.edit.submit.loading : t.submit.loading)
            : (isEditMode ? DASHBOARD_TEXTS.edit.submit.btn : t.submit.btn)
          }
        </Button>
      </div>

    </form>
  )
}
