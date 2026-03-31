'use client'

import { useState, useCallback, useEffect } from 'react'
import { Phone, Mail, MessageSquare, Bell, Lock, CheckCircle, XCircle } from 'lucide-react'
import type { BilarSettings } from '../../../lib/features/bilar-settings-service'
import {
  updateOrgSettingsAction,
  updateProfileSettingsAction,
  sendPasswordResetAction,
} from '../../actions/settings-actions'

interface Toast {
  message: string
  type: 'success' | 'error'
}

function Switch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  id?: string
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      style={{
        background: checked ? '#2563EB' : '#CBD5E1',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  )
}

function SettingRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  loading,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
  loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <Icon size={18} strokeWidth={1.75} style={{ color: '#64748B', marginTop: 2, flexShrink: 0 }} />
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{label}</p>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{description}</p>
          )}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={loading} />
    </div>
  )
}

export default function InstallningarClient({ settings }: { settings: BilarSettings }) {
  const [orgSettings, setOrgSettings] = useState(settings.org)
  const [profileSettings, setProfileSettings] = useState(settings.profile)
  const [loading, setLoading] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((message: string, type: Toast['type']) => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const handleOrgToggle = useCallback(
    async (field: keyof typeof orgSettings, value: boolean) => {
      const previous = orgSettings[field]
      setOrgSettings((prev) => ({ ...prev, [field]: value }))
      setLoading(field)

      const result = await updateOrgSettingsAction(settings.orgId, { [field]: value })
      setLoading(null)

      if (!result.success) {
        setOrgSettings((prev) => ({ ...prev, [field]: previous }))
        showToast(result.error ?? 'Kunde inte spara', 'error')
      } else {
        showToast('Sparat', 'success')
      }
    },
    [orgSettings, settings.orgId, showToast]
  )

  const handleProfileToggle = useCallback(
    async (field: keyof typeof profileSettings, value: boolean) => {
      const previous = profileSettings[field]
      setProfileSettings((prev) => ({ ...prev, [field]: value }))
      setLoading(field)

      const result = await updateProfileSettingsAction(settings.profileId, { [field]: value })
      setLoading(null)

      if (!result.success) {
        setProfileSettings((prev) => ({ ...prev, [field]: previous }))
        showToast(result.error ?? 'Kunde inte spara', 'error')
      } else {
        showToast('Sparat', 'success')
      }
    },
    [profileSettings, settings.profileId, showToast]
  )

  const handlePasswordReset = useCallback(async () => {
    if (!settings.userEmail) return
    setLoading('password')
    const result = await sendPasswordResetAction(settings.userEmail)
    setLoading(null)

    if (!result.success) {
      showToast(result.error ?? 'Kunde inte skicka länk', 'error')
    } else {
      setResetSent(true)
      showToast('Länk skickad — kolla din e-post', 'success')
    }
  }, [settings.userEmail, showToast])

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6" style={{ color: '#0F172A' }}>
        Inställningar
      </h1>

      {/* Kontaktkanaler */}
      <section className="mb-5">
        <div
          className="rounded-xl border p-5"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Kontaktkanaler
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              Standardinställning för hur köpare kan kontakta er på annonser.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
            <SettingRow
              icon={Phone}
              label="Visa telefonnummer"
              description="Visa ert telefonnummer på annonssidor."
              checked={orgSettings.show_phone}
              onChange={(v) => handleOrgToggle('show_phone', v)}
              loading={loading === 'show_phone'}
            />
            <SettingRow
              icon={Mail}
              label="Visa e-post"
              description="Visa er e-postadress på annonssidor."
              checked={orgSettings.show_email}
              onChange={(v) => handleOrgToggle('show_email', v)}
              loading={loading === 'show_email'}
            />
            <SettingRow
              icon={MessageSquare}
              label="Aktivera chatt"
              description="Låt köpare skicka förfrågningar via chattformuläret."
              checked={orgSettings.contact_via_chat}
              onChange={(v) => handleOrgToggle('contact_via_chat', v)}
              loading={loading === 'contact_via_chat'}
            />
          </div>
        </div>
      </section>

      {/* Notifieringar */}
      <section className="mb-5">
        <div
          className="rounded-xl border p-5"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Notifieringar
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              Välj hur du vill bli aviserad om aktivitet på ditt konto.
            </p>
          </div>
          <div>
            <SettingRow
              icon={Bell}
              label="E-postavisering vid nya leads"
              description="Få ett e-postmeddelande när en ny förfrågan inkommer."
              checked={profileSettings.email_notifications}
              onChange={(v) => handleProfileToggle('email_notifications', v)}
              loading={loading === 'email_notifications'}
            />
          </div>
        </div>
      </section>

      {/* Säkerhet */}
      <section>
        <div
          className="rounded-xl border p-5"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Säkerhet
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              Hantera ditt lösenord och kontosäkerhet.
            </p>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              <Lock size={18} strokeWidth={1.75} style={{ color: '#64748B', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#0F172A' }}>Byt lösenord</p>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {settings.userEmail
                    ? `Skicka en återställningslänk till ${settings.userEmail}`
                    : 'Skicka en återställningslänk till din e-post'}
                </p>
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={loading === 'password' || resetSent}
              className="shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
              style={{
                background: resetSent ? '#F0FDF4' : '#F8FAFC',
                color: resetSent ? '#16A34A' : '#0F172A',
                border: '1px solid',
                borderColor: resetSent ? '#BBF7D0' : '#E2E8F0',
                opacity: loading === 'password' ? 0.6 : 1,
                cursor: loading === 'password' || resetSent ? 'not-allowed' : 'pointer',
              }}
            >
              {resetSent ? 'Länk skickad' : loading === 'password' ? 'Skickar…' : 'Skicka länk'}
            </button>
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-[68px] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
          style={{
            background: toast.type === 'success' ? '#0F172A' : '#FEF2F2',
            color: toast.type === 'success' ? '#FFFFFF' : '#DC2626',
            zIndex: 50,
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={15} strokeWidth={2} />
          ) : (
            <XCircle size={15} strokeWidth={2} />
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
