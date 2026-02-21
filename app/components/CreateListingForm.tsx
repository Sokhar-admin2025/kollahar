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
import { createListingAction, updateListingAction } from '@/app/actions/listing-actions'
import { withErrorRef } from '@/lib/error-ref'
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
  const [bortskankes, setBortskankes] = useState(false)
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
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isVisible, setIsVisible] = useState(true)

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
      setPrice(initialData.bortskankes ? '' : initialData.price.toString())
      setBortskankes(Boolean(initialData.bortskankes))
      setLocation(initialData.location)
      setCategory(initialData.category || '')
      setExistingImageUrls(initialData.images || [])
      const attributes = initialData.attributes || {}
      // Type-safe access to attributes with fallback to empty string
      // Kontrollera om kategorin tillhör "Fordon"-gruppen
      const vehiclesGroup = CATEGORY_GROUPS.find(group => group.id === 'vehicles')
      const isVehicleCategory = vehiclesGroup?.children.some(child => child.id === initialData.category) ?? false
      // Lägg endast in condition om det INTE är en fordon-kategori
      if (!isVehicleCategory) {
        setCondition(typeof attributes.condition === 'string' ? attributes.condition : '')
      }
      setRegNr(typeof attributes.reg_nr === 'string' ? attributes.reg_nr : '')
      setMake(typeof attributes.make === 'string' ? attributes.make : '')
      setModel(typeof attributes.model === 'string' ? attributes.model : '')
      setFuel(typeof attributes.fuel === 'string' ? attributes.fuel : '')
      setGearbox(typeof attributes.gearbox === 'string' ? attributes.gearbox : '')
      setYear(attributes.year ? String(attributes.year) : '')
      setMileage(attributes.mileage ? String(attributes.mileage) : '')
      setIsVisible(initialData.status !== 'draft')
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

  // Förifyll plats med stad/ort (city) – aldrig postnummer. För företag: city; för privat: location
  useEffect(() => {
    const prefillLocationFromProfile = async () => {
      if (isEditMode || location) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('city, location')
          .eq('id', user.id)
          .maybeSingle()

        const rawCity = (profile as { city?: string | null } | null)?.city?.trim() || ''
        let rawLocation = (profile as { location?: string | null } | null)?.location?.trim() || ''
        // Ta bort ledande postnummer (12345 eller 123 45) om location används som fallback
        const withoutZip = rawLocation.replace(/^(\d{5}|\d{3}\s\d{2})\s+/, '').trim()
        rawLocation = withoutZip || rawLocation

        // Företag: använd city (stad/ort) – aldrig postnummer. Privat: location (utan postnr om det fanns)
        const toUse = rawCity || rawLocation
        if (toUse && !/\S+@\S+\.\S+/.test(toUse)) {
          setLocation(toUse)
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

  const getFieldError = (name: string) => errors[name]?.[0]
  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      delete next._form
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({}) // Rensa gamla fel

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('Du verkar ha blivit utloggad. Försök logga in igen.')
        router.push('/login')
        return
      }

      if (isEditMode && initialData?.user_id !== user.id) {
        alert('Du har inte behörighet att redigera denna annons.')
        router.push('/dashboard')
        return
      }

      const vehiclesGroup = CATEGORY_GROUPS.find(group => group.id === 'vehicles')
      const isVehicleCategory = vehiclesGroup?.children.some(child => child.id === category) ?? false

      // Pris: vid bortskänkes = 0; annars krävs minst 1 kr
      const priceNum = bortskankes ? 0 : (() => {
        const priceWithoutSpaces = price.replace(/\s/g, '')
        const n = parseInt(priceWithoutSpaces, 10)
        return isNaN(n) ? -1 : n
      })()

      // Klientvalidering av bilfält – visa fel som röd text istället för alert
      if (isCarsCategory) {
        const newErrors: Record<string, string[]> = {}
        if (!make) newErrors.make = ['Märke saknas']
        if (!model) newErrors.model = ['Modell saknas']
        if (!fuel) newErrors.fuel = ['Drivmedel saknas']
        if (!gearbox) newErrors.gearbox = ['Välj växellåda']
        if (!year) newErrors.year = ['Årsmodell saknas']
        if (!mileage) newErrors.mileage = ['Miltal saknas']
        if (year) {
          const yearNum = parseInt(year, 10)
          if (isNaN(yearNum) || yearNum < 1960 || yearNum > new Date().getFullYear() + 1) {
            newErrors.year = ['Ogiltigt årsmodell']
          }
        }
        if (mileage) {
          const mileageNum = parseInt(mileage, 10)
          if (isNaN(mileageNum) || mileageNum < 0) {
            newErrors.mileage = ['Ogiltigt miltal']
          }
        }
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors)
          setLoading(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }

      setUploading(true)

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
          const err = uploadError as { message?: string }
          const msg = String(err?.message ?? '')
          const userMsg = msg.toUpperCase().includes('MAX_LIMIT_REACHED')
            ? 'Det gick inte att ladda upp bilderna. Ta bort några äldre bilder eller annonser och försök igen.'
            : 'Bilduppladdning misslyckades. Försök igen.'
          setErrors({ _form: [withErrorRef(userMsg, uploadError)] })
          setUploading(false)
          setLoading(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }

      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls]

      const attributes: Record<string, unknown> = {}
      if (!isVehicleCategory && condition) attributes.condition = condition
      if (isCarsCategory) {
        const yearNum = parseInt(year, 10)
        const mileageNum = parseInt(mileage, 10)
        attributes.model_year = yearNum
        attributes.year = yearNum
        attributes.mileage = mileageNum
        attributes.make = make.trim()
        attributes.model = model.trim()
        attributes.fuel = fuel
        attributes.gearbox = gearbox
        if (regNr) attributes.reg_nr = regNr.trim()
        if (bodyType) attributes.body_type = bodyType
        if (color) attributes.color = color.trim()
        if (colorCustom) attributes.color_custom = colorCustom.trim()
        if (driveWheel) attributes.drive_wheel = driveWheel
        if (horsePower) {
          const hpNum = parseInt(horsePower, 10)
          if (!isNaN(hpNum) && hpNum > 0) attributes.horse_power = hpNum
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        bortskankes,
        location: location.trim(),
        category,
        images: allImageUrls,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        status: (isVisible ? 'active' : 'draft') as 'active' | 'draft',
      }

      let result
      if (isEditMode && initialData) {
        result = await updateListingAction({ ...payload, id: initialData.id })
      } else {
        result = await createListingAction(payload)
      }

      if (!result.success) {
        const nextErrors: Record<string, string[]> = {}
        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
          for (const [key, value] of Object.entries(result.fieldErrors)) {
            nextErrors[key] = Array.isArray(value) ? value : [String(value)]
          }
        }
        if (result.error) nextErrors._form = [result.error]
        setErrors(nextErrors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (isEditMode) {
        router.push('/dashboard')
      } else {
        router.push('/annons/' + result.data!.id)
      }
      router.refresh()
      onSuccess?.()
    } catch (error: unknown) {
      setErrors({ _form: [withErrorRef('Ett oväntat fel inträffade. Försök igen senare.', error)] })
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
    <form onSubmit={handleSubmit} noValidate className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
      {getFieldError('_form') && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm antialiased" role="alert">
          {getFieldError('_form')}
        </div>
      )}

      {/* Sektion A: Obligatoriska fält */}
      <div className="space-y-6">
        <h2 className="text-xl font-display text-brand-green mb-4">Obligatoriska uppgifter</h2>

        {/* Rubrik */}
        <div>
          <label
            htmlFor="listing-title"
            className={`block text-sm font-medium mb-1 antialiased ${getFieldError('title') ? 'text-red-600' : 'text-brand-text'}`}
          >
            {t.form.title.label} <span className="text-red-500">*</span>
          </label>
          <input
            id="listing-title"
            type="text"
            required
            aria-invalid={!!getFieldError('title')}
            aria-describedby={getFieldError('title') ? 'title-error' : undefined}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased ${getFieldError('title') ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}`}
            placeholder={t.form.title.placeholder}
            value={title}
            onChange={(e) => { setTitle(e.target.value); clearFieldError('title') }}
          />
          {getFieldError('title') && (
            <p id="title-error" className="text-sm text-red-600 mt-1 antialiased font-medium" role="alert">
              {getFieldError('title')}
            </p>
          )}
        </div>

        {/* Plats */}
        <div>
          <label className={`block text-sm font-medium mb-1 antialiased ${getFieldError('location') ? 'text-red-600' : 'text-brand-text'}`}>
            {t.form.location.label} <span className="text-red-500">*</span>
          </label>
          <LocationInput
            value={location}
            onChange={(v) => { setLocation(v); clearFieldError('location') }}
            placeholder={t.form.location.placeholder}
            required
            hasError={!!getFieldError('location')}
          />
          {getFieldError('location') && (
            <p id="location-error" className="text-sm text-red-600 mt-1 antialiased font-medium" role="alert">
              {getFieldError('location')}
            </p>
          )}
        </div>

        {/* Pris */}
        <div>
          <label className={`block text-sm font-medium mb-1 antialiased ${!bortskankes && getFieldError('price') ? 'text-red-600' : 'text-brand-text'}`}>
            {t.form.price.label} {!bortskankes && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            inputMode="numeric"
            required={!bortskankes}
            disabled={bortskankes}
            aria-invalid={!bortskankes && !!getFieldError('price')}
            aria-describedby={getFieldError('price') ? 'price-error' : undefined}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${bortskankes ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : getFieldError('price') ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}`}
            placeholder={bortskankes ? '' : t.form.price.placeholder}
            value={bortskankes ? '' : (price ? formatPrice(price) : '')}
            onChange={(e) => { if (!bortskankes) { handlePriceChange(e); clearFieldError('price') } }}
            onBlur={handlePriceBlur}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bortskankes}
              onChange={(e) => {
                const checked = e.target.checked
                setBortskankes(checked)
                if (checked) setPrice('')
                clearFieldError('price')
              }}
              className="w-4 h-4 text-brand-green rounded focus:ring-brand-green"
            />
            <span className="text-sm text-brand-text antialiased">Bortskänkes</span>
          </label>
          {getFieldError('price') && (
            <p id="price-error" className="text-sm text-red-600 mt-1 antialiased" role="alert">
              {getFieldError('price')}
            </p>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label className={`block text-sm font-medium mb-1 antialiased ${getFieldError('category') ? 'text-red-600' : 'text-brand-text'}`}>
            Vad ska du sälja? <span className="text-red-500">*</span>
          </label>
          <select
            aria-invalid={!!getFieldError('category')}
            aria-describedby={getFieldError('category') ? 'category-error' : undefined}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased ${getFieldError('category') ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}`}
            value={category}
            onChange={(e) => { setCategory(e.target.value); clearFieldError('category') }}
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
          {getFieldError('category') && (
            <p id="category-error" className="text-sm text-red-600 mt-1 antialiased" role="alert">
              {getFieldError('category')}
            </p>
          )}
        </div>

        {/* Skick (endast för icke-fordon, valfritt) */}
        {!isVehicleCategory && (
          <div>
            <label className={`block text-sm font-medium mb-1 antialiased ${getFieldError('condition') ? 'text-red-600' : 'text-brand-text'}`}>
              Skick
            </label>
            <select
              aria-invalid={!!getFieldError('condition')}
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased ${getFieldError('condition') ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}`}
              value={condition}
              onChange={(e) => { setCondition(e.target.value); clearFieldError('condition') }}
            >
              <option value="">Välj skick (valfritt)</option>
              {conditionOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {getFieldError('condition') && (
              <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
                {getFieldError('condition')}
              </p>
            )}
          </div>
        )}

        {/* Märke & Modell (endast för bilar) */}
        {isCarsCategory && (
          <div>
            <CarMakeModelFields
              make={make}
              model={model}
              onMakeChange={(v) => { setMake(v); clearFieldError('make') }}
              onModelChange={(v) => { setModel(v); clearFieldError('model') }}
              required
            />
            {(getFieldError('make') || getFieldError('model')) && (
              <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
                {getFieldError('make') || getFieldError('model')}
              </p>
            )}
          </div>
        )}

        {/* Modellår (endast för bilar, obligatoriskt) */}
        {isCarsCategory && (
          <div>
            <YearInput
              value={year}
              onChange={(v) => { setYear(v); clearFieldError('year') }}
              required={true}
            />
            {getFieldError('year') && (
              <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
                {getFieldError('year')}
              </p>
            )}
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
              aria-invalid={!!getFieldError('mileage')}
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getFieldError('mileage') ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="T.ex. 50000"
              value={mileage}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setMileage(val)
                clearFieldError('mileage')
              }}
            />
            {getFieldError('mileage') && (
              <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
                {getFieldError('mileage')}
              </p>
            )}
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
                  onClick={() => { setFuel(opt); clearFieldError('fuel') }}
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
            {getFieldError('fuel') && (
              <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
                {getFieldError('fuel')}
              </p>
            )}
          </div>
        )}

        {/* Växellåda (endast för bilar, obligatoriskt – under Drivmedel) */}
        {isCarsCategory && (
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
              Växellåda <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {gearboxOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setGearbox(opt); clearFieldError('gearbox') }}
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
            {getFieldError('gearbox') && (
              <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
                {getFieldError('gearbox')}
              </p>
            )}
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
          {getFieldError('images') && (
            <p className="text-sm text-red-600 mt-1 antialiased" role="alert">
              {getFieldError('images')}
            </p>
          )}
        </div>

        {/* Beskrivning */}
        <div>
          <label className={`block text-sm font-medium mb-1 antialiased ${getFieldError('description') ? 'text-red-600' : 'text-brand-text'}`}>
            {t.form.description.label} <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            aria-invalid={!!getFieldError('description')}
            aria-describedby={getFieldError('description') ? 'description-error' : undefined}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased ${getFieldError('description') ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}`}
            placeholder={t.form.description.placeholder}
            value={description}
            onChange={(e) => { setDescription(e.target.value); clearFieldError('description') }}
          />
          {getFieldError('description') && (
            <p id="description-error" className="text-sm text-red-600 mt-1 antialiased" role="alert">
              {getFieldError('description')}
            </p>
          )}
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

      {/* Toggle: Synlig för alla – gömd = draft, ingen annan ser annonsen */}
      <div className="flex items-center justify-between gap-4 py-4 px-4 rounded-xl bg-brand-beige/50 border border-gray-200">
        <div>
          <p className="font-medium text-brand-text antialiased">Synlig för alla</p>
          <p className="text-sm text-brand-text/70 antialiased">
            {isVisible ? 'Annonsen visas i sökningen.' : 'Annonsen är gömd – endast du ser den tills du aktiverar.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isVisible}
          aria-label={isVisible ? 'Synlig för alla – klicka för att gömma' : 'Gömd – klicka för att visa'}
          onClick={() => setIsVisible((v) => !v)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 ${
            isVisible ? 'bg-brand-green' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
              isVisible ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

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
