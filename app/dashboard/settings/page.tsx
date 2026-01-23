'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import Button from '@/app/components/atoms/Button'
import Header from '@/app/components/organisms/Header'
import { createClient } from '@/lib/supabase/client'

// Supabase-klient via delad SSR-kompatibel wrapper
const supabase = createClient()

export default function SettingsPage() {
  const router = useRouter()
  const t = DASHBOARD_TEXTS.settings
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Formulär-data
  const [fullName, setFullName] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // Consent / GDPR
  const [consentMarketing, setConsentMarketing] = useState(false)
  const [consentAnalytics, setConsentAnalytics] = useState(false)

  // 1. Hämta profil när sidan laddas
  useEffect(() => {
    const getProfile = async () => {
      // Kolla vem som är inloggad
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { 
        router.push('/login')
        return 
      }
      
      setUserId(user.id)

      // Hämta profildata från tabellen 'profiles'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setWebsite(data.website || '')
        setAvatarUrl(data.avatar_url || '')
        setConsentMarketing(data.consent_marketing || false)
        setConsentAnalytics(data.consent_analytics || false)
      }
      setLoading(false)
    }

    getProfile()
  }, [router])

  // 2. Spara ändringar (UPPDATERAD MED UPSERT)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    
    // Vi använder "upsert" istället för "update".
    // Det betyder: Uppdatera om den finns, skapa ny om den saknas.
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId, // <--- VIKTIGT: Vi måste skicka med ID vid upsert
        full_name: fullName,
        website,
        avatar_url: avatarUrl,
        consent_marketing: consentMarketing,
        consent_analytics: consentAnalytics,
        updated_at: new Date().toISOString()
      })

    setSaving(false)

    if (error) {
      alert('Kunde inte spara: ' + error.message)
      console.error(error)
    } else {
      alert(t.save.success)
      router.refresh()
    }
  }

  // 3. Ladda upp bild (Avatar)
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      // Skapa ett unikt filnamn
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Ladda upp till 'avatars' hinken
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Hämta den publika URL:en för bilden
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      // Spara URL:en i statet (så vi ser bilden direkt)
      setAvatarUrl(data.publicUrl)
      
    } catch (error) {
      alert('Fel vid uppladdning av bild.')
      console.error(error)
    }
  }

  if (loading) return <div className="p-10 text-center">Laddar inställningar...</div>

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto py-10 px-4 flex-grow">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-display text-brand-green">{t.title}</h1>
            <Link href="/dashboard" className="text-sm text-brand-text hover:text-brand-green antialiased">{t.back}</Link>
        </div>

        {/* Formulär */}
        <form onSubmit={handleSave} className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-8">
            
            {/* SEKTION: PROFIL */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">{t.sections.profile}</h2>
                
                {/* Avatar-uppladdning */}
                <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border border-gray-300 relative">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-text text-2xl">👤</div>
                        )}
                    </div>
                    <div>
                        <label className="cursor-pointer bg-white border border-gray-300 text-brand-text px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-beige transition shadow-sm">
                            {t.form.avatar.changeBtn}
                            {/* Dolt fil-input fält */}
                            <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} />
                        </label>
                    </div>
                </div>

                {/* Namn-fält */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.name.label}</label>
                    <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.form.name.placeholder}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                    />
                </div>

                {/* Hemsida-fält */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.website.label}</label>
                    <input 
                        type="url" 
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder={t.form.website.placeholder}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                    />
                </div>
            </div>

            {/* SEKTION: CONSENT / GDPR */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                    {t.sections.privacy} 
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Viktigt</span>
                </h2>
                
                <div className="space-y-4">
                    {/* Marknadsföring Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-brand-beige transition">
                        <input 
                            type="checkbox" 
                            checked={consentMarketing}
                            onChange={(e) => setConsentMarketing(e.target.checked)}
                            className="mt-1 w-5 h-5 text-brand-green rounded focus:ring-brand-green"
                        />
                        <span className="text-sm text-brand-text">{t.form.consents.marketing}</span>
                    </label>

                    {/* Analytics Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-brand-beige transition">
                        <input 
                            type="checkbox" 
                            checked={consentAnalytics}
                            onChange={(e) => setConsentAnalytics(e.target.checked)}
                            className="mt-1 w-5 h-5 text-brand-green rounded focus:ring-brand-green"
                        />
                        <span className="text-sm text-brand-text">{t.form.consents.analytics}</span>
                    </label>
                </div>
            </div>

            <hr />

            {/* Spara-knapp */}
            <Button type="submit" disabled={saving} className="w-full py-3 text-lg font-bold">
                {saving ? t.save.loading : t.save.btn}
            </Button>
        </form>
      </div>
    </div>
  )
}