'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// ÄNDRING 1: Vi byter ut importen till SSR-paketet
import { createBrowserClient } from '@supabase/ssr'

import { DASHBOARD_TEXTS } from '../../lib/content'
import Button from '../../components/atoms/Button'

export default function CreateListing() {
  const router = useRouter()
  
  // ÄNDRING 2: Vi skapar klienten inuti komponenten (eller utanför, men med rätt funktion)
  // Denna klient kan läsa dina inloggnings-cookies!
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('Övrigt')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const t = DASHBOARD_TEXTS.create

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return

      if (imagePreviews.length >= 5) {
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

  const removeImage = (indexToRemove: number) => {
    const previewToRemove = imagePreviews[indexToRemove]
    if (previewToRemove) URL.revokeObjectURL(previewToRemove)
    setImageFiles(imageFiles.filter((_, index) => index !== indexToRemove))
    setImagePreviews(imagePreviews.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Nu kommer denna hitta din session eftersom vi använder createBrowserClient!
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Du verkar ha blivit utloggad. Försök logga in igen.')
        router.push('/login')
        return
      }

      setUploading(true)

      // Ladda upp bilderna
      const uploadedImageUrls = await Promise.all(
        imageFiles.map(async (file) => {
          // Skapa unikt filnamn för att undvika krockar
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
          // Spara i en mapp baserad på användarens ID för ordning och reda (valfritt, men bra)
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

      const { error } = await supabase
        .from('listings')
        .insert({
          title,
          description,
          price: parseInt(price),
          location,
          category,
          images: uploadedImageUrls,
          user_id: user.id, // Koppla annonsen till dig
          status: 'active'
        })

      if (error) throw error

      // Succé! Skicka användaren till startsidan eller dashboard
      router.push('/dashboard')
      router.refresh() // Uppdatera sidan så nya annonsen syns

    } catch (error: any) {
      console.error('Error creating listing:', error)
      alert('Kunde inte skapa annons: ' + error.message)
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t.header}</h1>
          <Button variant="link" onClick={() => router.push('/dashboard')}>
            {t.backLink}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.form.title.label}
            </label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder={t.form.title.placeholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.form.category.label}
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.form.price.label}
              </label>
              <input
                type="number"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={t.form.price.placeholder}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.form.location.label}
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={t.form.location.placeholder}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.form.description.label}
            </label>
            <textarea
              required
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
              <span className="text-xs text-gray-400">
                {imagePreviews.length}/5 bilder
              </span>
            </div>
            
            <div className="flex flex-wrap gap-4 mb-3">
              {imagePreviews.map((url, index) => (
                <div key={index} className="w-24 h-24 relative rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={url} alt="Uppladdad" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              {imagePreviews.length < 5 && (
                <label className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className="text-2xl text-gray-400">+</span>
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
            {uploading && <p className="text-sm text-blue-600 animate-pulse">{t.form.image.uploading}</p>}
          </div>

          <hr className="border-gray-100" />

          <div className="pt-2">
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-4 text-lg font-bold"
              disabled={loading || uploading}
            >
              {loading ? t.submit.loading : t.submit.btn}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}