'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, UserCircle2, AlertCircle } from 'lucide-react'
import type { OrgMember } from '../../../../lib/features/bilar-leads-service'

interface BilarCommanderModalProps {
  leadId: string
  organizationId: string
  currentAssignedTo: string | null
  currentUserId: string
  orgMembers: OrgMember[]
  onClose: () => void
  reassignAction: (
    leadId: string,
    organizationId: string,
    newAssigneeProfileId: string
  ) => Promise<{ success: boolean; error?: string }>
}

function displayName(member: OrgMember): string {
  if (member.full_name?.trim()) return member.full_name.trim()
  if (member.email) return member.email.split('@')[0]
  return 'Okänt namn'
}

function initials(member: OrgMember): string {
  const name = displayName(member)
  if (name === 'Okänt namn') return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function BilarCommanderModal({
  leadId,
  organizationId,
  currentAssignedTo,
  currentUserId,
  orgMembers,
  onClose,
  reassignAction,
}: BilarCommanderModalProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<OrgMember | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSelect = (member: OrgMember) => {
    if (member.id === currentAssignedTo) return
    setSelected(member)
    setError(null)
  }

  const handleConfirm = () => {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await reassignAction(leadId, organizationId, selected.id)
      if (!result.success) {
        setError(result.error ?? 'Kunde inte omfördela leadet.')
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="commander-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-sm overflow-hidden rounded-2xl shadow-xl"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: '#F1F5F9' }}
          >
            <h2
              id="commander-title"
              className="text-base font-semibold"
              style={{ color: '#0F172A' }}
            >
              Omfördela lead
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 transition hover:bg-[#F1F5F9]"
              aria-label="Stäng"
            >
              <X className="h-4 w-4" style={{ color: '#64748B' }} />
            </button>
          </div>

          {/* Medlemslista */}
          <div className="max-h-72 overflow-y-auto px-2 py-2">
            {orgMembers.filter((m) => m.id !== currentUserId).length === 0 ? (
              <p className="px-3 py-6 text-center text-sm" style={{ color: '#94A3B8' }}>
                Du har inga teammedlemmar att omfördela till. Bjud in teammedlemmar under Inställningar.
              </p>
            ) : (
              orgMembers.map((member) => {
                const isCurrent = member.id === currentAssignedTo
                const isSelected = selected?.id === member.id
                const isSelf = member.id === currentUserId

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    disabled={isCurrent || isSelf}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
                    style={{
                      background: isSelected ? '#EFF6FF' : undefined,
                      cursor: isCurrent || isSelf ? 'default' : 'pointer',
                      opacity: isCurrent || isSelf ? 0.5 : 1,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ background: '#EFF6FF', color: '#2563EB' }}
                    >
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar_url}
                          alt={displayName(member)}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials(member)
                      )}
                    </div>

                    {/* Namn */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>
                        {displayName(member)}
                      </p>
                      {isCurrent && (
                        <p className="text-[11px]" style={{ color: '#94A3B8' }}>
                          Nuvarande
                        </p>
                      )}
                      {isSelf && !isCurrent && (
                        <p className="text-[11px]" style={{ color: '#94A3B8' }}>
                          Du
                        </p>
                      )}
                    </div>

                    {/* Bock om vald eller nuvarande */}
                    {(isCurrent || isSelected) && (
                      <Check
                        className="h-4 w-4 shrink-0"
                        style={{ color: isSelected ? '#2563EB' : '#94A3B8' }}
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Bekräftelse / fel */}
          <div
            className="border-t px-5 py-4"
            style={{ borderColor: '#F1F5F9' }}
          >
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#FEF2F2' }}>
                <AlertCircle className="h-4 w-4 shrink-0" style={{ color: '#EF4444' }} />
                <p className="text-xs" style={{ color: '#EF4444' }}>
                  {error}
                </p>
              </div>
            )}

            {selected ? (
              <div>
                <p className="mb-3 text-sm" style={{ color: '#64748B' }}>
                  Omfördela till{' '}
                  <span className="font-semibold" style={{ color: '#0F172A' }}>
                    {displayName(selected)}
                  </span>
                  ? Detta loggas i leadets historik.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    disabled={isPending}
                    className="flex-1 rounded-lg border py-2 text-sm font-medium transition hover:bg-[#F8FAFC] disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#2563EB' }}
                  >
                    {isPending ? 'Omfördelar…' : 'Bekräfta'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
                Välj en teammedlem ovan
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
