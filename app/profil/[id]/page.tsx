import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfile, getProfileStats } from '@/lib/features/profiles/profile-service'
import { getActiveListingsByUserId } from '@/lib/features/listings/listing-service'
import { getCategoryLabel } from '@/lib/categories'
import ListingCard from '@/app/components/ListingCard'
import { BadgeCheck, ExternalLink } from 'lucide-react'
import type { Listing } from '@/app/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id: userId } = await params
  if (!userId) notFound()

  const [profileResult, statsResult] = await Promise.all([
    getPublicProfile(userId),
    getProfileStats(userId),
  ])

  if (!profileResult.success || profileResult.data === null) notFound()
  const profile = profileResult.data

  const accountType = profile.account_type ?? 'private'
  let currentUserId: string | null = null

  if (accountType === 'private') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?reason=private_profile&next=${encodeURIComponent(`/profil/${userId}`)}`)
    currentUserId = user.id
  }

  const stats = statsResult.success ? statsResult.data : { totalSold: 0, byCategory: {} as Record<string, number> }
  const activeListingsResult = await getActiveListingsByUserId(userId)
  const activeListings: Listing[] = activeListingsResult.success ? (activeListingsResult.data ?? []) : []

  const displayName = profile.full_name?.trim() || 'Anonym säljare'
  const firstLetter = displayName.charAt(0).toUpperCase() || 'A'
  const dateForMemberSince = profile.created_at ?? profile.updated_at
  const memberSinceYear = dateForMemberSince ? new Date(dateForMemberSince).getFullYear() : null
  const isCompany = profile.account_type === 'company'
  const isCompanyVerified = isCompany && profile.is_company_verified === true
  const showCompanyBadge = isCompany
  const website = profile.account_type === 'company' ? (profile.website?.trim() || null) : null

  const categoryLabels = Object.entries(stats.byCategory)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${getCategoryLabel(cat)}: ${count}`)
  const statsSubtext = categoryLabels.length > 0 ? `(${categoryLabels.join(', ')})` : null

  return (
    <div className="min-h-screen bg-brand-beige">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <Link
          href="/"
          className="inline-block mb-6 text-sm font-medium text-brand-text/70 hover:text-brand-green transition"
        >
          ← Tillbaka
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-200 bg-brand-beige flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-display font-semibold text-brand-green">
                  {firstLetter}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-display font-bold text-brand-text truncate">
                  {displayName}
                </h1>
                {showCompanyBadge && (
                  <span className="inline-flex items-center text-brand-green" title={isCompanyVerified ? 'Verifierat företag' : 'Företag'}>
                    <BadgeCheck className="w-6 h-6 flex-shrink-0" aria-hidden />
                  </span>
                )}
              </div>
              {memberSinceYear && (
                <p className="text-sm text-brand-text/70 mt-1">Medlem sedan {memberSinceYear}</p>
              )}
              {(profile.account_type === 'company'
                ? [profile.zip_code, profile.city].filter(Boolean).join(' ') || profile.city || profile.address
                : profile.location) && (
                <p className="text-sm text-brand-text/70 mt-0.5">
                  {profile.account_type === 'company'
                    ? [profile.zip_code, profile.city].filter(Boolean).join(' ') || profile.city || profile.address
                    : profile.location}
                </p>
              )}
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand-green hover:underline mt-2"
                >
                  Webbplats
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Företagsinformation (endast företag) */}
        {accountType === 'company' && (profile.bio || profile.org_number || profile.address || profile.zip_code || profile.city) && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 mb-6">
            <h2 className="text-lg font-semibold text-brand-text border-b border-gray-200 pb-2 mb-4">Företagsinformation</h2>
            {profile.org_number && (
              <p className="text-sm text-brand-text/80 mb-2">
                <span className="font-medium text-brand-text">Org.nummer:</span> {profile.org_number}
              </p>
            )}
            {(profile.address || profile.zip_code || profile.city) && (
              <p className="text-sm text-brand-text/80 mb-2">
                <span className="font-medium text-brand-text">Adress:</span>{' '}
                {[profile.address, profile.zip_code, profile.city].filter(Boolean).join(', ')}
              </p>
            )}
            {profile.bio && (
              <div className="mt-3">
                <p className="text-sm font-medium text-brand-text mb-1">Företagspresentation</p>
                <p className="text-sm text-brand-text/80 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <p className="text-lg font-semibold text-brand-text">
            Tidigare försäljningar: {stats.totalSold} st
          </p>
          {statsSubtext && (
            <p className="text-sm text-brand-text/70 mt-1">{statsSubtext}</p>
          )}
        </div>

        {/* Active Listings */}
        <div className="mb-4">
          <h2 className="text-xl font-display font-semibold text-brand-text">Aktiva annonser</h2>
        </div>
        {activeListings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-10 text-center text-brand-text/70">
            Inga aktiva annonser just nu.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeListings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} currentUserId={currentUserId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
