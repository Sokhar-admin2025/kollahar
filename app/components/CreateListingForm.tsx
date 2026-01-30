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
import CarMakeModelFields from './CarMakeModelFields'
import YearInput from './YearInput'
import { CAR_COLORS } from '@/lib/car-colors'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  const [colorCustom, setColorCustom] = useState('')
  const [driveWheel, setDriveWheel] = useState('')
  const [horsePower, setHorsePower] = useState('')
  const [showMoreDetails, setShowMoreDetails] = useState(false)
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
  const fuelOptions = ['Bensin', 'Diesel', 'El', 'Hybrid', 'Gas'].sort()
  const gearboxOptions = ['Manuell', 'Automat']
  const bodyTypeOptions = ['Cab', 'Coupé', 'Halvkombi', 'Kombi', 'Minibuss', 'Sedan', 'Skåpbil', 'SUV'].sort()
  const driveWheelOptions = ['Fram', 'Bak', 'Fyrhjulsdrift']
  const isCarsCategory = category === 'cars'
  
  // Kolla om kategorin tillhör "Fordon"-gruppen (vehicles)
  const vehiclesGroup = CATEGORY_GROUPS.find(group => group.id === 'vehicles')
  const isVehicleCategory = vehiclesGroup?.children.some(child => child.id === category) ?? false
  const maxImages = isVehicleCategory ? 15 : 5

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
      setColorCustom(typeof attributes.color_custom === 'string' ? attributes.color_custom : '')
      setDriveWheel(typeof attributes.drive_wheel === 'string' ? attributes.drive_wheel : '')
      setHorsePower(typeof attributes.horse_power === 'string' ? String(attributes.horse_power) : (attributes.horse_power ? String(attributes.horse_power) : ''))
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
      if (totalImages >= maxImages) {
        alert(`Max ${maxImages} bilder tillåtna${isVehicleCategory ? ' för fordon' : ''}.`)
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

      // Validera pris (ta bort tusentalsavgränsare först)
      const priceWithoutSpaces = price.replace(/\s/g, '')
      const priceNum = parseInt(priceWithoutSpaces, 10)
      if (isNaN(priceNum) || priceNum < 0) {
        alert('Ogiltigt pris. Ange ett positivt heltal.')
        setLoading(false)
        return
      }

      // Validera obligatoriska fält
      if (!title.trim()) {
        alert('Rubrik är obligatorisk.')
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
        // Obligatoriska: make, model, fuel, year (model_year), mileage
        if (!make || !model || !fuel) {
          alert('Fyll i alla obligatoriska bilfält (Märke, Modell, Bränsle).')
          setLoading(false)
          return
        }

        // Modellår är obligatoriskt för bilar
        if (!year) {
          alert('Modellår är obligatoriskt för bilar.')
          setLoading(false)
          return
        }
        const yearNum = parseInt(year)
        if (isNaN(yearNum) || yearNum < 1960 || yearNum > new Date().getFullYear() + 1) {
          alert('Ogiltigt årsmodell.')
          setLoading(false)
          return
        }
        attributes.model_year = yearNum
        attributes.year = yearNum // Bakåtkompatibilitet

        // Miltal är obligatoriskt för bilar
        if (!mileage) {
          alert('Miltal är obligatoriskt för bilar.')
          setLoading(false)
          return
        }
        const mileageNum = parseInt(mileage)
        if (isNaN(mileageNum) || mileageNum < 0) {
          alert('Ogiltigt miltal.')
          setLoading(false)
          return
        }
        attributes.mileage = mileageNum

        // Spara alla fält (obligatoriska + valfria)
        if (regNr) attributes.reg_nr = regNr.trim()
        attributes.make = make.trim()
        attributes.model = model.trim()
        attributes.fuel = fuel
        if (gearbox) attributes.gearbox = gearbox
        if (bodyType) attributes.body_type = bodyType
        if (color) attributes.color = color.trim()
        if (colorCustom) attributes.color_custom = colorCustom.trim()
        if (driveWheel) attributes.drive_wheel = driveWheel
        if (horsePower) {
          const hpNum = parseInt(horsePower)
          if (!isNaN(hpNum) && hpNum > 0) {
            attributes.horse_power = hpNum
          }
        }
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

  // Formatera pris med tusentalsavgränsare (svensk format: 3 000)
  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/\s/g, '') // Ta bort mellanslag
    if (!numericValue) return ''
    const num = parseInt(numericValue, 10)
    if (isNaN(num)) return ''
    return num.toLocaleString('sv-SE')
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ta bort allt utom siffror
    const numericOnly = e.target.value.replace(/\D/g, '')
    setPrice(numericOnly) // Spara som ren siffra
  }

  const handlePriceBlur = () => {
    // Formatera med tusentalsavgränsare vid blur
    if (price) {
      const formatted = formatPrice(price)
      // Uppdatera input-värdet visuellt (men behåll price som ren siffra)
    }
  }

  const allImages = [...existingImageUrls, ...imagePreviews]
  const totalImages = allImages.length

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
      
      {/* Sektion A: Obligatoriska fält */}
      <div className="space-y-6">
        <h2 className="text-xl font-display text-brand-green mb-4">Obligatoriska uppgifter</h2>

        {/* Rubrik */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
            {t.form.title.label} <span className="text-red-500">*</span>
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

        {/* Plats */}
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

        {/* Pris */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
            {t.form.price.label} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder={t.form.price.placeholder}
            value={price ? formatPrice(price) : ''}
            onChange={handlePriceChange}
            onBlur={handlePriceBlur}
          />
        </div>

        {/* Kategori */}
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

        {/* Skick */}
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

        {/* Märke & Modell (endast för bilar) */}
        {isCarsCategory && (
          <CarMakeModelFields
            make={make}
            model={model}
            onMakeChange={setMake}
            onModelChange={setModel}
            required
          />
        )}

        {/* Modellår (endast för bilar, obligatoriskt) */}
        {isCarsCategory && (
          <div>
            <YearInput
              value={year}
              onChange={setYear}
              required={true}
            />
          </div>
        )}

        {/* Miltal (endast för bilar, obligatoriskt) */}
        {isCarsCategory && (
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
              Miltal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="T.ex. 50000"
              value={mileage}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setMileage(val)
              }}
            />
          </div>
        )}

        {/* Drivmedel (endast för bilar) */}
        {isCarsCategory && (
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
              Drivmedel <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {fuelOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFuel(opt)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    fuel === opt
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bilder */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-brand-text antialiased">
              {t.form.image.label} {isVehicleCategory && <span className="text-red-500">*</span>}
            </label>
            <span className="text-xs text-brand-text antialiased">
              {totalImages}/{maxImages} bilder
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
            {totalImages < maxImages && (
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

        {/* Beskrivning */}
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
      </div>

      {/* Sektion B: Fler detaljer (Collapsible) */}
      {isCarsCategory && (
        <div className="border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="flex items-center justify-between w-full text-left text-brand-text hover:text-brand-green transition-colors"
          >
            <span className="text-sm font-medium antialiased">
              Tryck för fler detaljer (Valfritt)
            </span>
            {showMoreDetails ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {showMoreDetails && (
            <div className="mt-6 space-y-6">

              {/* Växellåda (Chips) */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                  Växellåda
                </label>
                <div className="flex flex-wrap gap-2">
                  {gearboxOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setGearbox(opt)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        gearbox === opt
                          ? 'bg-brand-green text-white'
                          : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drivhjul (Chips) */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                  Drivhjul
                </label>
                <div className="flex flex-wrap gap-2">
                  {driveWheelOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDriveWheel(driveWheel === opt ? '' : opt)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        driveWheel === opt
                          ? 'bg-brand-green text-white'
                          : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kaross (Dropdown) */}
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

              {/* Färg (Custom Select med cirkel) */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                  Färg
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value)
                    if (e.target.value !== 'Annan') {
                      setColorCustom('')
                    }
                  }}
                >
                  <option value="">Välj färg</option>
                  {CAR_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Annan">Annan</option>
                </select>
                {color === 'Annan' && (
                  <input
                    type="text"
                    className="w-full mt-2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                    placeholder="Ange färg"
                    value={colorCustom}
                    onChange={(e) => setColorCustom(e.target.value)}
                  />
                )}
              </div>

              {/* Regnr */}
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

              {/* Effekt */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                  Effekt
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="T.ex. 150"
                    value={horsePower}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setHorsePower(val)
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">hk</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


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
