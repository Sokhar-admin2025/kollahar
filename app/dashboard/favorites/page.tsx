import Link from 'next/link'
import { redirect } from 'next/navigation'
import ListingCard from '../../components/ListingCard'
import { Heart } from 'lucide-react'
import { DASHBOARD_TEXTS } from '../../lib/content'
import type { Listing } from '../../types'
import { createClient } from '../../../lib/supabase/server'

interface FavoriteRow {
  id: string
  user_id: string
  listing_id: string
  created_at: string
  listing: Listing | null
}

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, listing:listings(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const favoriteListings = (favorites as FavoriteRow[] | null)
    ?.map((favorite) => favorite.listing)
    .filter((listing): listing is Listing => Boolean(listing)) ?? []

  const t = DASHBOARD_TEXTS

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="max-w-6xl mx-auto p-6 w-full flex-grow">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Favoriter</h3>
          <span className="text-sm text-gray-500">{favoriteListings.length} träffar</span>
        </div>

        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          <Link
            href="/dashboard"
            className="pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t text-gray-500 hover:text-gray-700"
          >
            {t.tabs.active}
          </Link>
          <Link
            href="/dashboard/favorites"
            className="pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t text-blue-600 border-b-2 border-blue-600 inline-flex items-center gap-2"
          >
            <Heart size={16} />
            Sparade annonser ({favoriteListings.length})
          </Link>
          <Link
            href="/dashboard?tab=history"
            className="pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t text-gray-500 hover:text-gray-700"
          >
            {t.tabs.history}
          </Link>
        </div>

        {favoriteListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">Du har inte sparat några annonser än</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {favoriteListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                currentUserId={user.id}
                authReady
                isFavorited
                locationPrefix={t.landing.listings.locationPrefix}
                noImageLabel={t.listing.noImage}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
