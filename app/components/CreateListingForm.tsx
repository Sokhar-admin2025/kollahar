'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { DASHBOARD_TEXTS } from '../lib/content'
import Button from './atoms/Button'
import LocationInput from './LocationInput'
import type { Listing } from '../types'

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
  const [category, setCategory] = useState('Övrigt')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  // Ref för att hålla koll på preview URLs för cleanup
  const previewUrlsRef = useRef<string[]>([])
  previewUrlsRef.current = imagePreviews

  const t = DASHBOARD_TEXTS.create

  // Fyll i formuläret med initialData om det finns (edit mode)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setPrice(initialData.price.toString())
      setLocation(initialData.location)
      setCategory(initialData.category)
      setExistingImageUrls(initialData.images || [])
    }
  }, [initialData])

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
      if (totalImages >= 5) {
        alert(t.form.image.errorTooMany)
        return 
      }

      const file = e.target.files[0]

      if (file.size > 2 * 1024 * 1024) {
        alert(t.form.image.errorTooBig)
        return 
      }

      const previewUrl = URL.createObjectURL(file)
      setImageFiles([...imageFiles, file])
      setImagePreviews([...imagePreviews, previewUrl])
    } catch (error: any) {
      alert('Fel vid uppladdning: ' + error.message)
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
        } catch (uploadError: any) {
          // Om uppladdning misslyckas, kasta fel
          throw new Error(`Bilduppladdning misslyckades: ${uploadError.message}`)
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

    } catch (error: any) {
      console.error('Error saving listing:', error)
      alert(`Kunde inte ${isEditMode ? 'uppdatera' : 'skapa'} annons: ${error.message}`)
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
          {t.form.category.label}
        </label>
        <select
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition bg-white text-brand-text antialiased"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {t.form.category.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
            {t.form.price.label}
          </label>
          <input
            type="number"
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
            placeholder={t.form.price.placeholder}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
            {t.form.location.label}
          </label>
          <LocationInput
            value={location}
            onChange={setLocation}
            placeholder={t.form.location.placeholder}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
          {t.form.description.label}
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
            {totalImages}/5 bilder
          </span>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-3">
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
          {totalImages < 5 && (
            <label className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-brand-beige hover:border-brand-green transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-2xl text-brand-text">+</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={uploading}
                className="hidden" 
              />
            </label>
          )}
        </div>
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
