'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toggleFavoriteAction } from '@/app/actions/favorite-actions'
import { useFavoritLoginToast } from '@/app/context/FavoritLoginToastContext'

const supabase = createClient()

interface FavoriteButtonProps {
  listingId: string
  /** Om satt används detta (ingen egen fetch = undviker N+1). Annars hämtas status en gång med useEffect (t.ex. annonsdetaljsida). */
  isFavorited?: boolean
  onFavoriteRemoved?: (listingId: string) => void
}

export default function FavoriteButton({
  listingId,
  isFavorited: isFavoritedProp,
  onFavoriteRemoved,
}: FavoriteButtonProps) {
  const { showFavoritLoginToast } = useFavoritLoginToast()
  const [fetchedFavorited, setFetchedFavorited] = useState<boolean | null>(null)
  const [optimisticFavorited, setOptimisticFavorited] = useState<boolean | null>(null)

  useEffect(() => {
    if (isFavoritedProp !== undefined) return
    let isMounted = true
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return
      const { data } = await supabase
        .from('favorites')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle()
      if (isMounted) setFetchedFavorited(!!data)
    }
    check()
    return () => { isMounted = false }
  }, [listingId, isFavoritedProp])

  const resolvedInitial =
    isFavoritedProp !== undefined ? isFavoritedProp : (fetchedFavorited ?? false)
  const isFavorited = optimisticFavorited !== null ? optimisticFavorited : resolvedInitial

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showFavoritLoginToast()
      return
    }

    const previous = optimisticFavorited !== null ? optimisticFavorited : isFavoritedProp ?? false
    setOptimisticFavorited(!previous)

    const result = await toggleFavoriteAction(listingId)

    if (!result.success) {
      setOptimisticFavorited(previous)
      return
    }

    if (!result.added && onFavoriteRemoved) {
      onFavoriteRemoved(listingId)
    }
  }

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all duration-200 group/btn cursor-pointer hover:scale-110 active:scale-95 border border-transparent hover:border-gray-100"
      aria-label="Spara som favorit"
    >
      <Heart
        className={`w-5 h-5 transition-colors duration-200 ${
          isFavorited
            ? 'fill-red-500 text-red-500'
            : 'text-gray-600 group-hover/btn:text-red-500'
        }`}
      />
    </button>
  )
}
