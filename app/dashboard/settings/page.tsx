'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'
import { Loader2 } from 'lucide-react'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import Button from '@/app/components/atoms/Button'
import LocationInput from '@/app/components/LocationInput'
import { createClient } from '@/lib/supabase/client'
import { validateDomainMatch } from '@/lib/utils'

// Supabase-klient via delad SSR-kompatibel wrapper
const supabase = createClient()

export default function SettingsPage() {
  const router = useRouter()
  const t = DASHBOARD_TEXTS.settings
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [compressingAvatar, setCompressingAvatar] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  // Formulär-data
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [accountType, setAccountType] = useState<'private' | 'company'>('private')
  const [orgNumber, setOrgNumber] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [contactPerson, setContactPerson] = useState('')

  const [saveSuccessNotis, setSaveSuccessNotis] = useState(false)
  const [upgradeSectionExpanded, setUpgradeSectionExpanded] = useState(false)

  // Upgrade till företag (State A)
  const [upgradeCompanyName, setUpgradeCompanyName] = useState('')
  const [upgradeOrgNumber, setUpgradeOrgNumber] = useState('')
  const [upgradeWebsite, setUpgradeWebsite] = useState('')
  const [upgradeEmail, setUpgradeEmail] = useState('')
  const [upgradeSaving, setUpgradeSaving] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        const row = data as Record<string, unknown>
        setFullName((row.full_name as string) || '')

        // Om location ser ut som en e-postadress (gammal data från website) → visa tomt fält
        const rawLocation = (row.location as string) || ''
        const looksLikeEmail = /\S+@\S+\.\S+/.test(rawLocation)
        setLocation(looksLikeEmail ? '' : rawLocation)
        setAvatarUrl((row.avatar_url as string) || '')
        setConsentMarketing(Boolean(row.consent_marketing))
        setConsentAnalytics(Boolean(row.consent_analytics))
        setAccountType((row.account_type as 'private' | 'company') || 'private')
        setOrgNumber((row.org_number as string) || '')
        setWebsite((row.website as string) || '')
        setAddress((row.address as string) || '')
        setZipCode((row.zip_code as string) || '')
        const rawCity = (row.city as string) || ''
        setCity(/\S+@\S+\.\S+/.test(rawCity) ? '' : rawCity)
        setBio((row.bio as string) || '')
        setContactPerson((row.contact_person as string) || '')
      }
      setLoading(false)
    }

    getProfile()
  }, [router])

  // 2. Spara ändringar (UPPDATERAD MED UPSERT)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (accountType === 'company') {
      const zip = zipCode.trim() || null
      const cityVal = city.trim() || null
      const addr = address.trim() || null
      const locationSync = [zip, cityVal].filter(Boolean).join(' ') || cityVal || addr
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          address: addr,
          zip_code: zip,
          city: cityVal,
          bio: bio.trim() || null,
          contact_person: contactPerson.trim() || null,
          location: locationSync,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      setSaving(false)
      if (error) {
        alert('Kunde inte spara: ' + error.message)
        console.error(error)
      } else {
        setSaveSuccessNotis(true)
        setTimeout(() => setSaveSuccessNotis(false), 3000)
        router.refresh()
      }
      return
    }

    // Privat: namn obligatoriskt, spara profil + consent (sätt aldrig e-post i location)
    if (!fullName.trim()) {
      alert('Namn är obligatoriskt. Fyll i ditt namn innan du sparar.')
      return
    }

    const locationValue = /\S+@\S+\.\S+/.test(location) ? '' : location
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        location: locationValue,
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

  // Upgrade privat → företag: byt e-post + sätt företagsdata, signOut, redirect
  const upgradeDomainMismatch =
    Boolean(upgradeEmail.trim() && upgradeWebsite.trim()) &&
    !validateDomainMatch(upgradeEmail.trim(), upgradeWebsite.trim())

  const handleUpgradeToCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !email) return
    if (!upgradeCompanyName.trim() || !upgradeOrgNumber.trim() || !upgradeWebsite.trim() || !upgradeEmail.trim()) {
      setUpgradeMessage({ text: 'Fyll i alla fält: företagsnamn, orgnummer, webbplats och ny företags-e-post.', type: 'error' })
      return
    }
    if (upgradeDomainMismatch) {
      setUpgradeMessage({ text: 'E-postens domän måste matcha webbplatsens domän.', type: 'error' })
      return
    }
    setUpgradeSaving(true)
    setUpgradeMessage(null)
    const newEmail = upgradeEmail.trim()
    const siteNorm = upgradeWebsite.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || upgradeWebsite.trim()
    const companyNameTrim = upgradeCompanyName.trim()
    const orgTrim = upgradeOrgNumber.trim()
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
        data: {
          full_name: companyNameTrim,
          org_number: orgTrim,
          website: siteNorm,
          account_type: 'company',
        },
      })
      if (updateError) {
        setUpgradeMessage({ text: updateError.message || 'Kunde inte uppdatera e-post.', type: 'error' })
        setUpgradeSaving(false)
        return
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: companyNameTrim,
          org_number: orgTrim,
          website: siteNorm,
          account_type: 'company',
          otp_verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (profileError) {
        console.error(profileError)
        setUpgradeMessage({ text: 'Profilen kunde inte uppdateras. Kontakta support.', type: 'error' })
        setUpgradeSaving(false)
        return
      }
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: newEmail,
        options: { shouldCreateUser: false },
      })
      if (otpError) {
        setUpgradeMessage({
          text: otpError.message?.includes('rate limit') ? 'För många försök. Försök igen senare.' : 'Kunde inte skicka verifieringskod till ny e-post. Försök igen.',
          type: 'error',
        })
        setUpgradeSaving(false)
        return
      }
      await supabase.auth.signOut()
      router.push(`/login/verify?email=${encodeURIComponent(newEmail)}&type=signup&from=upgrade`)
      router.refresh()
    } catch (err) {
      console.error(err)
      setUpgradeMessage({ text: 'Ett oväntat fel uppstod.', type: 'error' })
      setUpgradeSaving(false)
    }
  }

  // 3. Ladda upp bild (Avatar)
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]

      // Komprimera bilden innan uppladdning
      setCompressingAvatar(true)
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
        setCompressingAvatar(false)
      }

      // Kontrollera storlek efter komprimering
      if (compressedFile.size > 2 * 1024 * 1024) {
        alert('Bilden är för stor. Maximal storlek är 2MB.')
        return
      }

      // Skapa ett unikt filnamn
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Ladda upp till 'avatars' hinken
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile)

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
      setCompressingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-beige flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
          <p className="text-brand-text antialiased">Laddar inställningar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <div className="max-w-2xl mx-auto py-10 px-4 flex-grow">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-display text-brand-green">{t.title}</h1>
            <Link href="/dashboard" className="text-sm text-brand-text hover:text-brand-green antialiased">{t.back}</Link>
        </div>

        {/* Formulär */}
        <form onSubmit={handleSave} className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-8">
            
            {/* SEKTION: PROFIL (privat) eller FÖRETAG (låsta + adress/bio) */}
            <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4 border-b pb-2">
                  <h2 className="text-lg font-semibold text-brand-text antialiased">
                    {accountType === 'company' ? 'Företagsinformation' : t.sections.profile}
                  </h2>
                  {accountType !== 'company' && email && (
                    <span className="text-sm text-brand-text/70 antialiased">
                      Inloggad som: &quot;{email}&quot;
                    </span>
                  )}
                </div>
                
                {accountType === 'company' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Företagsnamn</label>
                      <input type="text" value={fullName} readOnly className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 antialiased" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Organisationsnummer</label>
                      <input type="text" value={orgNumber} readOnly className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 antialiased" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Webbplats</label>
                      <input type="text" value={website} readOnly className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 antialiased" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Adress <span className="text-xs text-brand-text/60">(valfritt)</span></label>
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Gatuadress" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased" />
                    </div>
                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Postnummer</label>
                        <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="123 45" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Ort</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Stockholm" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Företagspresentation <span className="text-xs text-brand-text/60">(valfritt)</span></label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kort beskrivning av företaget" rows={3} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased resize-y" />
                    </div>
                  </>
                ) : (
                  <>
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
                            <label className={`cursor-pointer bg-white border border-gray-300 text-brand-text px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-beige transition shadow-sm ${compressingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {compressingAvatar ? 'Bearbetar bild...' : t.form.avatar.changeBtn}
                                <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={compressingAvatar} />
                            </label>
                        </div>
                    </div>

                    {/* Användarnamn / e-post (privat: skrivskyddad, eget fält – aldrig i Min plats) */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Användarnamn / e-post</label>
                        <input
                            type="text"
                            value={email ?? ''}
                            readOnly
                            className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 antialiased"
                            aria-readonly="true"
                        />
                    </div>

                    {/* Namn-fält (privat: endast Namn) */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Namn</label>
                        <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ditt namn"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                        />
                    </div>

                    {/* Min plats (valfritt) – endast ort/plats, aldrig e-post */}
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                          {t.form.location.label}{' '}
                          <span className="text-xs text-brand-text/60">(Valfritt)</span>
                        </label>
                        <LocationInput
                          value={/\S+@\S+\.\S+/.test(location) ? '' : location}
                          onChange={(val) => setLocation(/\S+@\S+\.\S+/.test(val) ? '' : val)}
                          placeholder={t.form.location.placeholder}
                          className="mt-1"
                          autoComplete="off"
                        />
                    </div>
                  </>
                )}
            </div>

            {/* UPPGRADERA TILL FÖRETAG flyttas ned under Spara-knappen, se nedan */}

            {/* SEKTION: ANVÄNDARUPPGIFTER (endast företag) */}
            {accountType === 'company' && (
              <div>
                <h2 className="text-lg font-semibold text-brand-text mb-4 border-b pb-2 antialiased">Användaruppgifter</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Användarnamn / e-post</label>
                    <input
                      type="text"
                      value={email ?? ''}
                      readOnly
                      className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 antialiased"
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Kontaktperson <span className="text-xs text-brand-text/60">(valfritt)</span></label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="t.ex. Anna Andersson"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEKTION: CONSENT / GDPR (endast för privat) */}
            {accountType !== 'company' && (
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
            )}

            {/* SEKTION: LÖSENORD — länk till dedikerad sida */}
            <div>
                <h2 className="text-lg font-semibold text-brand-text mb-4 border-b pb-2 flex items-center gap-2 antialiased">
                    {t.sections.password}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Säkerhet</span>
                </h2>
                <p className="text-sm text-brand-text/70 mb-4">
                    Glömt lösenord eller byta lösenord? Hantera allt på vår dedikerade lösenordssida.
                </p>
                <Link
                  href="/dashboard/settings/password"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-green px-6 py-3 text-white font-medium hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition"
                >
                  Hantera lösenord
                </Link>
            </div>

            <hr />

            {saveSuccessNotis && (
              <div className="p-3 rounded-xl bg-green-100 text-green-800 text-sm text-center" role="status">
                Ändringarna är sparade.
              </div>
            )}

            {/* Spara-knapp */}
            <Button type="submit" disabled={saving} className="w-full py-3 text-lg font-bold">
                {saving ? t.save.loading : accountType === 'company' ? 'Spara ändringar' : t.save.btn}
            </Button>

            {/* SEKTION: VILL DU SÄLJA SOM FÖRETAG? (endast privat, nedanför Spara, expanderas vid klick) */}
            {accountType !== 'company' && (
              <div className="border border-brand-green/30 rounded-xl overflow-hidden bg-brand-beige/30">
                <button
                  type="button"
                  id="upgrade-heading"
                  onClick={() => setUpgradeSectionExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-brand-beige/50 transition"
                  aria-expanded={upgradeSectionExpanded}
                  aria-controls="upgrade-form"
                >
                  <span className="font-semibold text-brand-text antialiased">Vill du sälja som företag?</span>
                  <span className="text-brand-green flex-shrink-0" aria-hidden>
                    {upgradeSectionExpanded ? '−' : '+'}
                  </span>
                </button>
                {upgradeSectionExpanded && (
                  <div id="upgrade-form" className="px-6 pb-6 pt-0 space-y-4" role="group" aria-labelledby="upgrade-heading">
                    <p className="text-sm text-brand-text/80">Fyll i uppgifterna nedan. Din inloggning byts till en företags-e-post som matchar webbplatsens domän. Du får en verifieringslänk och loggas ut – logga in igen med de nya uppgifterna efter verifiering.</p>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Företagsnamn</label>
                      <input type="text" value={upgradeCompanyName} onChange={(e) => setUpgradeCompanyName(e.target.value)} placeholder="t.ex. Min Firma AB" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Organisationsnummer</label>
                      <input type="text" value={upgradeOrgNumber} onChange={(e) => setUpgradeOrgNumber(e.target.value)} placeholder="t.ex. 556123-4567" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Webbplats (domän)</label>
                      <input type="text" value={upgradeWebsite} onChange={(e) => setUpgradeWebsite(e.target.value)} placeholder="t.ex. foretag.se" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1 antialiased">Ny företags-e-post</label>
                      <input type="email" value={upgradeEmail} onChange={(e) => setUpgradeEmail(e.target.value)} placeholder="info@foretag.se" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased" />
                      {upgradeDomainMismatch && (
                        <p className="text-xs text-red-600 mt-1" role="alert">E-postens domän måste matcha webbplatsens domän.</p>
                      )}
                    </div>
                    {upgradeMessage && (
                      <div className={`p-3 rounded text-sm ${upgradeMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
                        {upgradeMessage.text}
                      </div>
                    )}
                    <Button type="button" disabled={upgradeSaving} onClick={(e) => { e.preventDefault(); handleUpgradeToCompany(e as unknown as React.FormEvent); }} className="w-full">
                      {upgradeSaving ? 'Skickar verifieringslänk...' : 'Byt till företagskonto'}
                    </Button>
                  </div>
                )}
              </div>
            )}

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

                    // Rensa session på klienten så att Header/profilikon uppdateras direkt
                    await supabase.auth.signOut()
                    // Redirect till startsidan – toast "Ditt konto har raderats!" visas där
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