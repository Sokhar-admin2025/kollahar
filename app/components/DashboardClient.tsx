'use client'

import { useEffect, useState, useMemo } from 'react'
import type { MouseEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Settings, LogOut, Edit, Trash2, BarChart3, Upload, Eye, EyeOff, Images } from 'lucide-react'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import Button from '@/app/components/atoms/Button'
import ListingCard from '@/app/components/ListingCard'
import ScrollToSearch from '@/app/components/ScrollToSearch'
import type { Listing } from '@/app/types'
import { deleteListingAction, markAsSoldAction, toggleListingVisibilityAction } from '@/app/actions/listing-actions'

const supabase = createClient()

interface DashboardClientProps {
  listings: Listing[]
  favoriteListings: Listing[]
  user: { id: string; email?: string }
  hasUnreadMessages?: boolean
  accountType?: string
}

export default function DashboardClient({
  listings,
  favoriteListings,
  user,
  hasUnreadMessages = false,
  accountType = 'private',
}: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeAds = useMemo(
    () => listings.filter((ad) => ad.status === 'active' || ad.status === 'draft'),
    [listings]
  )
  const soldAds = useMemo(
    () => listings.filter((ad) => ad.status === 'sold'),
    [listings]
  )

  const [activeTab, setActiveTab] = useState<'active' | 'favorites' | 'history'>('active')

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [adToDelete, setAdToDelete] = useState<Listing | null>(null)
  const [deleteReason, setDeleteReason] = useState('sold_here')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBackfillingImages, setIsBackfillingImages] = useState(false)
  const [backfillLiveMessage, setBackfillLiveMessage] = useState<string | null>(null)
  const [backfillSummary, setBackfillSummary] = useState<{
    message: string
    processedListings: number
    updatedListings: number
    replacedImages: number
    failedImages: number
    remainingCandidates: number
    listingErrors: string[]
  } | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  const t = DASHBOARD_TEXTS

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'history' || tab === 'active' || tab === 'favorites') {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/?logged_out=true')
    router.refresh()
  }

  const promptDelete = (e: MouseEvent<HTMLButtonElement>, ad: Listing) => {
    e.stopPropagation()
    setAdToDelete(ad)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!adToDelete) return
    setIsDeleting(true)

    try {
      if (deleteReason === 'just_delete' || deleteReason === 'sold_elsewhere') {
        const result = await deleteListingAction(
          adToDelete.id,
          deleteReason,
          adToDelete.title
        )
        if (!result.success) {
          alert('Fel: ' + result.error)
          return
        }
      } else {
        const result = await markAsSoldAction(
          adToDelete.id,
          deleteReason,
          adToDelete.title
        )
        if (!result.success) {
          alert('Fel: ' + result.error)
          return
        }
      }

      setIsDeleteModalOpen(false)
      setAdToDelete(null)
      setDeleteReason('sold_here')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Okänt fel'
      alert('Fel: ' + message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <div className="p-6 relative flex-grow">
        <div id="dashboard-header" className="mx-auto max-w-4xl mb-8 relative">
          <h1 className="text-3xl font-display text-brand-green mb-2">{t.header.title}</h1>
          <p className="text-brand-text antialiased">
            {t.header.welcome}{' '}
            <span className="font-semibold">{user.email ?? '...'}</span>
          </p>
          {accountType === 'company' && (
            <span
              title="Legacy-bildbackfill är slutförd och knappen är låst."
              className="absolute left-0 top-full -mt-1 translate-y-[2px] inline-flex items-center gap-1.5 p-0 text-xs font-medium text-brand-green select-none"
            >
              <Images size={14} />
              Process Legacy Images
            </span>
          )}
        </div>

        <div className="mx-auto max-w-4xl mb-6 flex items-center gap-4 justify-end">
          <div className="flex items-center gap-4">
            {accountType === 'company' && (
              <Link
                href="/dashboard/import"
                title="Importera CSV"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green/10 px-3 py-2 text-sm font-medium text-brand-green hover:bg-brand-green/20"
              >
                <Upload size={18} />
                Importera CSV
              </Link>
            )}
          {accountType === 'company' && (
            <>
              <Link
                href="/dashboard/dealer"
                title="Dealer Command Center"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green/10 px-3 py-2 text-sm font-medium text-brand-green hover:bg-brand-green/20"
              >
                <BarChart3 size={18} />
                Dealer Dashboard
              </Link>
            </>
          )}
          <Link href="/dashboard/messages" title="Mina meddelanden" className="relative">
            <div className="p-2 text-brand-text hover:text-brand-green hover:bg-brand-green/10 rounded-full transition cursor-pointer">
              <MessageSquare size={24} />
              {hasUnreadMessages && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand-green"
                  aria-hidden="true"
                />
              )}
            </div>
          </Link>

          <Link href="/dashboard/settings" title="Inställningar">
            <div className="p-2 text-brand-text hover:text-brand-green hover:bg-brand-green/10 rounded-full transition cursor-pointer">
              <Settings size={24} />
            </div>
          </Link>

          <Button variant="link" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut size={18} />
            {t.header.logout}
          </Button>
          </div>
        </div>

        {accountType === 'company' && (isBackfillingImages || backfillSummary || backfillError) && (
          <div className="mx-auto max-w-4xl mb-6">
            <div className={`rounded-xl border p-4 text-sm ${
              backfillError
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white text-brand-text'
            }`}>
              {isBackfillingImages ? (
                <div className="space-y-1 antialiased">
                  <p className="font-medium text-brand-green animate-pulse">Process Legacy Images körs...</p>
                  <p>{backfillLiveMessage ?? 'Bearbetar batch i bakgrunden.'}</p>
                  <p className="text-brand-text/70">Tips: en batch tar vanligtvis 20-90 sekunder beroende på antal och storlek på bilder.</p>
                </div>
              ) : backfillError ? (
                <p className="antialiased">{backfillError}</p>
              ) : backfillSummary ? (
                <div className="space-y-1 antialiased">
                  <p className="font-medium">{backfillSummary.message}</p>
                  <p>
                    Processade annonser: {backfillSummary.processedListings} · Uppdaterade annonser: {backfillSummary.updatedListings}
                  </p>
                  <p>
                    Ersatta bilder: {backfillSummary.replacedImages} · Bildfel: {backfillSummary.failedImages} · Kvar: {backfillSummary.remainingCandidates}
                  </p>
                  {backfillSummary.listingErrors.length > 0 && (
                    <p className="text-xs text-amber-700">
                      Exempel på bildfel: {backfillSummary.listingErrors.slice(0, 2).join(' | ')}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <main className="mx-auto max-w-4xl space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-brand-text antialiased">{t.ctaCard.title}</h2>
              <p className="text-brand-text text-sm antialiased">{t.ctaCard.subtitle}</p>
            </div>
            <Button onClick={() => router.push('/dashboard/create')}>
              {t.ctaCard.button}
            </Button>
          </div>

          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-brand-green rounded-t antialiased ${
                  activeTab === 'active' ? 'text-brand-green border-b-2 border-brand-green' : 'text-brand-text hover:text-brand-text'
                }`}
              >
                {t.tabs.active} ({activeAds.length})
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-brand-green rounded-t antialiased ${
                  activeTab === 'favorites' ? 'text-brand-green border-b-2 border-brand-green' : 'text-brand-text hover:text-brand-text'
                }`}
              >
                Sparade annonser ({favoriteListings.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-brand-green rounded-t antialiased ${
                  activeTab === 'history' ? 'text-brand-green border-b-2 border-brand-green' : 'text-brand-text hover:text-brand-text'
                }`}
              >
                {t.tabs.history} ({soldAds.length})
              </button>
            </div>

            <Link
              href="/"
              className="hidden md:inline-block text-sm font-medium text-brand-text hover:text-brand-green transition antialiased"
            >
              ← Till alla annonser
            </Link>
          </div>

          {/* AKTIVA ANNONSER – radlista (oförändrad UI) */}
          {activeTab === 'active' && (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              {activeAds.length === 0 ? (
                <div className="text-center py-10 text-brand-text bg-brand-beige rounded-xl border border-dashed border-gray-300">
                  <p className="antialiased">{t.emptyStates.active}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAds.map((ad) => (
                    <div
                      key={ad.id}
                      onClick={() => router.push(ad.status === 'draft' ? `/dashboard/edit/${ad.id}` : `/annons/${ad.id}`)}
                      className="group flex gap-4 p-4 border rounded-xl hover:bg-brand-beige transition cursor-pointer relative"
                    >
                      <div className="h-20 w-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden relative">
                        {ad.images && ad.images[0] ? (
                          <Image src={ad.images[0]} alt={ad.title} fill sizes="80px" className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-brand-text text-xs antialiased">
                            {t.listing.noImage}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-brand-text antialiased flex-1">{ad.title}</h3>
                          <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="icon"
                              onClick={async (e) => {
                                e.stopPropagation()
                                const res = await toggleListingVisibilityAction(ad.id)
                                if (res.success) router.refresh()
                                else if (res.error) alert(res.error)
                              }}
                              title={ad.status === 'draft' ? 'Visa annonsen för alla' : 'Göm annonsen'}
                            >
                              {ad.status === 'draft' ? <Eye size={20} /> : <EyeOff size={20} />}
                            </Button>
                            <Button
                              variant="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/edit/${ad.id}`)
                              }}
                              title="Redigera"
                            >
                              <Edit size={20} />
                            </Button>
                            <Button
                              variant="icon"
                              onClick={(e) => promptDelete(e, ad)}
                              title={t.listing.deleteTitle}
                            >
                              <Trash2 size={20} />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-brand-text text-sm font-semibold antialiased">{ad.bortskankes ? 'Bortskänkes' : `${ad.price} kr`}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${ad.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                            {ad.status === 'draft' ? 'Gömd' : t.listing.activeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORIK – tabell med horisontell scroll vid behov */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              {soldAds.length === 0 ? (
                <div className="p-10 text-center text-brand-text">
                  <p className="antialiased">{t.emptyStates.history}</p>
                </div>
              ) : (
                <div className="overflow-x-auto p-4 md:p-0">
                  <table className="w-full text-sm text-left min-w-[32rem]">
                    <thead className="text-xs text-brand-text uppercase bg-brand-beige border-b">
                      <tr>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.datePublished}</th>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap min-w-[120px]">{t.listing.historyHeaders.title}</th>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.price}</th>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.dateSold}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soldAds.map((ad) => (
                        <tr key={ad.id} className="bg-white border-b hover:bg-brand-beige/50">
                          <td className="px-4 md:px-6 py-4 text-brand-text antialiased whitespace-nowrap">
                            {new Date(ad.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 md:px-6 py-4 font-medium text-brand-text antialiased min-w-[120px]">
                            {ad.title}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-brand-text antialiased whitespace-nowrap">
                            {ad.bortskankes ? 'Bortskänkes' : `${ad.price} kr`}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-brand-text antialiased whitespace-nowrap">
                            {ad.deleted_at ? new Date(ad.deleted_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* FAVORITER */}
          {activeTab === 'favorites' && (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              {favoriteListings.length === 0 ? (
                <div className="text-center py-10 text-brand-text bg-brand-beige rounded-xl border border-dashed border-gray-300">
                  <p>Du har inte sparat några annonser än.</p>
                  <Link href="/" className="text-brand-green underline mt-2 inline-block hover:text-brand-green/80">
                    Till startsidan
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {favoriteListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      currentUserId={user.id}
                      isFavorited
                      onFavoriteRemoved={() => router.refresh()}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💔</span>
              </div>
              <h3 className="text-2xl font-display text-brand-green">{t.deleteModal.title}</h3>
              <p
                className="text-brand-text mt-2 antialiased"
                dangerouslySetInnerHTML={{
                  __html: t.deleteModal.description(adToDelete?.title ?? '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </div>

            <div className="bg-brand-beige p-4 rounded-xl mb-6 text-left">
              <p className="text-sm font-semibold text-brand-text mb-3">{t.deleteModal.question}</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/50 transition">
                  <input
                    type="radio"
                    name="reason"
                    value="sold_here"
                    checked={deleteReason === 'sold_here'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-4 h-4 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm text-brand-text">{t.deleteModal.options.soldHere}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/50 transition">
                  <input
                    type="radio"
                    name="reason"
                    value="sold_elsewhere"
                    checked={deleteReason === 'sold_elsewhere'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-4 h-4 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm text-brand-text">{t.deleteModal.options.soldElsewhere}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/50 transition">
                  <input
                    type="radio"
                    name="reason"
                    value="just_delete"
                    checked={deleteReason === 'just_delete'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-4 h-4 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm text-brand-text">{t.deleteModal.options.justDelete}</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-full">
                <Button variant="ghost" className="w-full" onClick={() => setIsDeleteModalOpen(false)}>
                  {t.deleteModal.buttons.cancel}
                </Button>
              </div>
              <div className="w-full">
                <Button variant="danger" className="w-full" onClick={confirmDelete} disabled={isDeleting}>
                  {isDeleting ? t.deleteModal.buttons.confirm : t.deleteModal.buttons.deleteNow}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScrollToSearch heroElementId="dashboard-header" />
    </div>
  )
}
