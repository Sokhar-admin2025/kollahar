'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import { AUTH_CONFIG } from '@/lib/constants'
import Button from '@/app/components/atoms/Button'
import Header from '@/app/components/organisms/Header'
import LocationInput from '@/app/components/LocationInput'
import { createClient } from '@/lib/supabase/client'

// Supabase-klient via delad SSR-kompatibel wrapper
const supabase = createClient()

export default function SettingsPage() {
  const router = useRouter()
  const t = DASHBOARD_TEXTS.settings
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  // Formulär-data
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // Consent / GDPR
  const [consentMarketing, setConsentMarketing] = useState(false)
  const [consentAnalytics, setConsentAnalytics] = useState(false)

  // Danger zone: radera konto
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
      setEmail(user.email ?? null)

      // Hämta profildata från tabellen 'profiles'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')

        // Om location ser ut som en e-postadress (gammal data från website) → visa tomt fält
        const rawLocation = data.location || ''
        const looksLikeEmail = /\S+@\S+\.\S+/.test(rawLocation)
        setLocation(looksLikeEmail ? '' : rawLocation)
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

    // Namn är obligatoriskt
    if (!fullName.trim()) {
      alert('Namn är obligatoriskt. Fyll i ditt namn eller företagsnamn innan du sparar.')
      return
    }

    setSaving(true)
    
    // Vi använder "upsert" istället för "update".
    // Det betyder: Uppdatera om den finns, skapa ny om den saknas.
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId, // <--- VIKTIGT: Vi måste skicka med ID vid upsert
        full_name: fullName,
        location,
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

  // 3. Byt lösenord (nuvarande + nytt)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    // Grundvalidering
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ text: t.password.errors.required, type: 'error' })
      return
    }

    if (newPassword.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      setPasswordMessage({ text: t.password.errors.minLength(AUTH_CONFIG.MIN_PASSWORD_LENGTH), type: 'error' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: t.password.errors.mismatch, type: 'error' })
      return
    }

    if (newPassword === currentPassword) {
      setPasswordMessage({ text: t.password.errors.sameAsOld, type: 'error' })
      return
    }

    setPasswordLoading(true)
    setPasswordMessage(null)

    try {
      // 1. Verifiera nuvarande lösenord via silent login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordMessage({ text: t.password.errors.currentInvalid, type: 'error' })
        setPasswordLoading(false)
        return
      }

      // 2. Uppdatera lösenordet
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        const msg = String(updateError.message || '').toLowerCase()
        if (msg.includes('new password should be different from the old password')) {
          setPasswordMessage({ text: t.password.errors.sameAsOld, type: 'error' })
        } else {
          console.error('Kunde inte uppdatera lösenord:', updateError)
          setPasswordMessage({ text: t.password.errors.generic, type: 'error' })
        }
        setPasswordLoading(false)
        return
      }

      // 3. Success
      setPasswordMessage({ text: t.password.success, type: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Fel vid uppdatering av lösenord:', err)
      setPasswordMessage({ text: t.password.errors.generic, type: 'error' })
    } finally {
      setPasswordLoading(false)
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
                <h2 className="text-lg font-semibold text-brand-text mb-4 border-b pb-2 antialiased">{t.sections.profile}</h2>
                
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
                    <label className="block text-sm font-medium text-brand-text mb-1 antialiased">{t.form.name.label}</label>
                    <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.form.name.placeholder}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                    />
                </div>

                {/* Plats / Hemvist (valfritt) */}
                <div>
                    <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                      {t.form.location.label}{' '}
                      <span className="text-xs text-brand-text/60">(Valfritt)</span>
                    </label>
                    <LocationInput
                      value={location}
                      onChange={setLocation}
                      placeholder={t.form.location.placeholder}
                      className="mt-1"
                    />
                </div>
            </div>

            {/* SEKTION: CONSENT / GDPR */}
            <div>
                <h2 className="text-lg font-semibold text-brand-text mb-4 border-b pb-2 flex items-center gap-2 antialiased">
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

            {/* SEKTION: BYT LÖSENORD */}
            <div>
                <h2 className="text-lg font-semibold text-brand-text mb-4 border-b pb-2 flex items-center gap-2 antialiased">
                    {t.sections.password}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Säkerhet</span>
                </h2>
                <p className="text-sm text-brand-text/70 mb-4">
                    {t.password.description}
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                            {t.password.currentLabel}
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                            autoComplete="current-password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                            {t.password.newLabel}
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                            autoComplete="new-password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                            {t.password.confirmLabel}
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                            autoComplete="new-password"
                        />
                    </div>

                    {passwordMessage && (
                      <div
                        className={`p-3 rounded text-sm text-center ${
                          passwordMessage.type === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                        role="alert"
                        aria-live="polite"
                      >
                        {passwordMessage.text}
                      </div>
                    )}

                    <div className="pt-2">
                        <Button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={passwordLoading}
                          className="w-full"
                        >
                          {passwordLoading ? t.password.loading : t.password.submit}
                        </Button>
                    </div>
                </div>
            </div>

            <hr />

            {/* Spara-knapp */}
            <Button type="submit" disabled={saving} className="w-full py-3 text-lg font-bold">
                {saving ? t.save.loading : t.save.btn}
            </Button>

            {/* DANGER ZONE: Radera konto */}
            <div className="mt-8 border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
              <h2 className="text-base font-semibold text-red-700">
                Radera konto
              </h2>
              <p className="text-sm text-red-700/80">
                Detta går inte att ångra. Alla dina annonser, favoriter och meddelanden tas bort permanent från Kollahär.
              </p>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                onClick={() => {
                  setDeleteConfirmText('')
                  setDeleteError(null)
                  setShowDeleteModal(true)
                }}
              >
                Radera mitt konto
              </Button>
            </div>
        </form>
      </div>

      {/* Modal för kontoradering */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-display text-red-700">
              Radera konto permanent
            </h2>
            <p className="text-sm text-brand-text">
              Detta går inte att ångra. Alla dina annonser, favoriter och meddelanden försvinner permanent från Kollahär.
            </p>
            <p className="text-sm text-brand-text font-medium">
              Skriv <span className="font-mono bg-red-50 px-1 rounded">RADERA</span> för att bekräfta.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value)
                setDeleteError(null)
              }}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition text-brand-text antialiased"
              placeholder="RADERA"
            />
            {deleteError && (
              <div
                className="p-2 rounded text-sm text-center bg-red-100 text-red-700"
                role="alert"
                aria-live="polite"
              >
                {deleteError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                  setDeleteError(null)
                }}
                disabled={deleting}
              >
                Avbryt
              </Button>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                disabled={deleting || deleteConfirmText !== 'RADERA'}
                onClick={async () => {
                  if (deleteConfirmText !== 'RADERA') {
                    setDeleteError('Du måste skriva RADERA för att bekräfta.')
                    return
                  }

                  setDeleting(true)
                  setDeleteError(null)

                  try {
                    const res = await fetch('/api/delete-account', {
                      method: 'POST',
                    })

                    if (!res.ok) {
                      const data = await res.json().catch(() => null)
                      setDeleteError(data?.error || 'Kunde inte radera ditt konto just nu. Försök igen.')
                      setDeleting(false)
                      return
                    }

                    // Redirecta till startsidan med specifik account-deleted-toast
                    router.push('/?logged_out=deleted')
                    router.refresh()
                  } catch (err) {
                    console.error('Kunde inte radera konto:', err)
                    setDeleteError('Kunde inte radera ditt konto just nu. Försök igen.')
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? 'Raderar konto...' : 'Ja, radera mitt konto'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}