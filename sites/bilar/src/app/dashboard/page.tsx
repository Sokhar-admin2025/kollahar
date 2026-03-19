import { createClient } from '../../lib/supabase/server'
import { getDashboardKpis, getRecentLeads, getRecentListings } from '../../lib/features/bilar-dashboard-service'
import type { LeadStatus } from '../../lib/features/bilar-dashboard-service'

// ─── Hjälpfunktioner ───────────────────────────────────────────

function formatPrice(p: number) {
  return p.toLocaleString('sv-SE') + ' kr'
}

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new:        'Ny',
  contacted:  'Kontaktad',
  qualified:  'Kvalificerad',
  sold:       'Såld',
  archived:   'Arkiverad',
}

const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new:        '#2563EB',
  contacted:  '#16A34A',
  qualified:  '#D97706',
  sold:       '#0F172A',
  archived:   '#94A3B8',
}

// ─── KPI-kort ─────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  highlight?: boolean
  sla?: boolean
}

function KpiCard({ label, value, highlight, sla }: KpiCardProps) {
  return (
    <div
      className="flex-1 min-w-0 rounded-lg flex flex-col gap-1 px-4 py-3"
      style={{
        background: sla ? '#EFF6FF' : '#F8FAFC',
        border: '0.5px solid #E2E8F0',
      }}
    >
      <span className="text-xs" style={{ color: '#64748B' }}>{label}</span>
      <span
        className="text-xl font-bold"
        style={{ color: sla ? '#1D4ED8' : highlight ? '#2563EB' : '#0F172A' }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Källbadge ────────────────────────────────────────────────

function SourceBadge({ site }: { site: string }) {
  const isMain = site === 'main'
  return (
    <span
      className="inline-block text-xs px-1.5 py-0.5 rounded font-medium"
      style={{
        background: isMain ? '#EFF6FF' : '#F0FDF4',
        color: isMain ? '#1D4ED8' : '#15803D',
      }}
    >
      {isMain ? 'Main' : 'Bilar'}
    </span>
  )
}

// ─── Statusprick ──────────────────────────────────────────────

function StatusDot({ status }: { status: LeadStatus }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ background: LEAD_STATUS_COLOR[status] }}
      />
      <span className="text-xs" style={{ color: '#64748B' }}>
        {LEAD_STATUS_LABEL[status]}
      </span>
    </span>
  )
}

// ─── Sida ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id ?? ''

  const [kpis, leads, listings] = await Promise.all([
    getDashboardKpis(supabase, organizationId, user.id),
    getRecentLeads(supabase, organizationId),
    getRecentListings(supabase, organizationId),
  ])

  return (
    <div className="space-y-5">

      {/* KPI-rad */}
      <div className="flex gap-4">
        <KpiCard label="Aktiva annonser"     value={String(kpis.activeListings)} />
        <KpiCard label="Nya leads"           value={String(kpis.newLeads)}        highlight={kpis.newLeads > 0} />
        <KpiCard label="Visningar (30 d)"    value={String(kpis.views30d)} />
        <KpiCard label="Avslut denna månad"  value={String(kpis.salesThisMonth)} />
        <KpiCard
          label="SLA ≤15 min"
          value={kpis.slaPercent !== null ? `${kpis.slaPercent}%` : '—'}
          sla
        />
      </div>

      {/* Nedre sektion — 2 kolumner */}
      <div className="grid grid-cols-2 gap-4">

        {/* Senaste leads */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '0.5px solid #E2E8F0', background: '#FFFFFF' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Senaste leads
            </h2>
          </div>
          {leads.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: '#94A3B8' }}>
              Inga leads ännu.
            </p>
          ) : (
            <table className="w-full">
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: '0.5px solid #F1F5F9', fontSize: '13px' }}
                  >
                    <td className="px-4 py-2.5" style={{ color: '#0F172A' }}>
                      {lead.buyerName}
                    </td>
                    <td className="px-4 py-2.5 max-w-[140px] truncate" style={{ color: '#64748B' }}>
                      {lead.listingTitle}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusDot status={lead.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SourceBadge site={lead.sourceSite} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Inventarie */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '0.5px solid #E2E8F0', background: '#FFFFFF' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Aktiva annonser
            </h2>
          </div>
          {listings.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: '#94A3B8' }}>
              Inga aktiva annonser.
            </p>
          ) : (
            <ul>
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: '0.5px solid #F1F5F9' }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-14 shrink-0 rounded overflow-hidden bg-bg-subtle"
                    style={{ height: '38px' }}
                  >
                    {listing.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: '#F1F5F9' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>
                      {[listing.make, listing.model, listing.year].filter(Boolean).join(' ') || 'Okänd'}
                    </p>
                    <p className="text-xs font-bold" style={{ color: '#2563EB' }}>
                      {formatPrice(listing.price)}
                    </p>
                  </div>

                  {/* Status-badge */}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ background: '#F0FDF4', color: '#15803D' }}
                  >
                    Aktiv
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
