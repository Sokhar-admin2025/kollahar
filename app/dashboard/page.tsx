'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'

import { DASHBOARD_TEXTS } from '../lib/content'
import Button from '../components/atoms/Button'
import ListingCard from '../components/ListingCard'
import type { Listing } from '../types'

const supabase = createClient()

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  
  const [activeAds, setActiveAds] = useState<any[]>([])
  const [soldAds, setSoldAds] = useState<any[]>([])
  const [favoriteAds, setFavoriteAds] = useState<Listing[]>([])
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'favorites' | 'history'>('active')

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [adToDelete, setAdToDelete] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState('sold_here')
  const [isDeleting, setIsDeleting] = useState(false)

  const t = DASHBOARD_TEXTS
  const searchParams = useSearchParams()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: userAds } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (userAds) {
        setActiveAds(userAds.filter(ad => ad.status === 'active'))
        setSoldAds(userAds.filter(ad => ad.status === 'sold'))
      }

      const { data: favorites } = await supabase
        .from('favorites')
        .select('*, listing:listings(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const favoriteListings = (favorites as { listing: Listing | null }[] | null)
        ?.map((favorite) => favorite.listing)
        .filter((listing): listing is Listing => Boolean(listing)) ?? []

      setFavoriteAds(favoriteListings)
      setLoading(false)
    }
    getData()
  }, [router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'history' || tab === 'active' || tab === 'favorites') {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const promptDelete = (e: any, ad: any) => {
    e.stopPropagation() 
    setAdToDelete(ad)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!adToDelete) return
    setIsDeleting(true)

    try {
      try {
        await supabase.from('deletion_logs').insert({
          user_id: user.id,
          reason: deleteReason,
          ad_title: adToDelete.title
        })
      } catch (err) { console.log("Logg misslyckades") }

      if (deleteReason === 'sold_here') {
        const { error } = await supabase
          .from('listings')
          .update({ status: 'sold', deleted_at: new Date().toISOString() })
          .eq('id', adToDelete.id)

        if (error) throw error

        const updatedAd = { ...adToDelete, status: 'sold', deleted_at: new Date().toISOString() }
        setActiveAds(activeAds.filter(a => a.id !== adToDelete.id))
        setSoldAds([updatedAd, ...soldAds])

      } else {
        const { error } = await supabase.from('listings').delete().eq('id', adToDelete.id)
        if (error) throw error
        setActiveAds(activeAds.filter(a => a.id !== adToDelete.id))
      }

      setIsDeleteModalOpen(false)
      setAdToDelete(null)
      setDeleteReason('sold_here')

    } catch (error: any) {
      alert('Fel: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Laddar...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      <header className="mx-auto max-w-4xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.header.title}</h1>
          <p className="text-gray-600">{t.header.welcome} <span className="font-semibold">{user?.email}</span></p>
        </div>
        
        <div className="flex items-center gap-6">
          
          {/* 1. Meddelanden (Pratbubbla) */}
          <Link href="/dashboard/messages" title="Mina meddelanden">
            <div className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition cursor-pointer relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
          </Link>

          {/* 2. NYTT: Inställningar (Kugghjul) */}
          <Link href="/dashboard/settings" title="Inställningar">
            <div className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
          </Link>

          {/* 3. Logga ut */}
          <Button variant="link" onClick={handleSignOut}>
            {t.header.logout}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6">
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t.ctaCard.title}</h2>
            <p className="text-gray-500 text-sm">{t.ctaCard.subtitle}</p>
          </div>
          
          <Button onClick={() => router.push('/dashboard/create')}>
            {t.ctaCard.button}
          </Button>
        </div>

        {/* FLIKAR */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t ${
              activeTab === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.tabs.active} ({activeAds.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t inline-flex items-center gap-2 ${
              activeTab === 'favorites' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart size={16} />
            Sparade annonser
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-1 font-medium text-sm transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t ${
              activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.tabs.history} ({soldAds.length})
          </button>
        </div>

        {/* AKTIVA ANNONSER */}
        {activeTab === 'active' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {activeAds.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-300">
                <p>{t.emptyStates.active}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAds.map((ad) => (
                  <div 
                    key={ad.id} 
                    onClick={() => router.push(`/annons/${ad.id}`)}
                    className="group flex gap-4 p-4 border rounded hover:bg-gray-50 transition cursor-pointer relative"
                  >
                    {/* KNAPPAR: Redigera & Radera */}
                    <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* 1. Redigera-knapp (Penna) */}
                        <Button 
                            variant="icon" 
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/edit/${ad.id}`)
                            }}
                            title="Redigera"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </Button>

                        {/* 2. Soptunnan */}
                        <Button 
                            variant="icon" 
                            onClick={(e) => promptDelete(e, ad)}
                            title={t.listing.deleteTitle}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </Button>
                    </div>

                    <div className="h-20 w-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                      {ad.images && ad.images[0] ? (
                        <img src={ad.images[0]} alt={ad.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">{t.listing.noImage}</div>
                      )}
                    </div>
                    <div className="flex-1 pr-10">
                      <h3 className="font-bold text-lg">{ad.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{ad.price} kr</p>
                      <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800">{t.listing.activeLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORIK (UPPDATERAD TABELL - Status borttagen, datum tillagt) */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {soldAds.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p>{t.emptyStates.history}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">{t.listing.historyHeaders.datePublished}</th>
                      <th className="px-6 py-3">{t.listing.historyHeaders.title}</th>
                      <th className="px-6 py-3">{t.listing.historyHeaders.price}</th>
                      <th className="px-6 py-3">{t.listing.historyHeaders.dateSold}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldAds.map((ad) => (
                      <tr key={ad.id} className="bg-white border-b hover:bg-gray-50">
                        {/* 1. SKAPAD DATUM */}
                        <td className="px-6 py-4">
                          {new Date(ad.created_at).toLocaleDateString()}
                        </td>
                        
                        {/* 2. TITEL */}
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {ad.title}
                        </td>
                        
                        {/* 3. PRIS */}
                        <td className="px-6 py-4">
                          {ad.price} kr
                        </td>
                        
                        {/* 4. SÅLD DATUM (Status-texten borttagen) */}
                        <td className="px-6 py-4 text-gray-900">
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
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {favoriteAds.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-300">
                <p>Du har inte sparat några annonser än.</p>
                <Link href="/" className="text-blue-600 underline mt-2 inline-block">
                  Till startsidan
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {favoriteAds.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    currentUserId={user?.id ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            
            <div className="text-center mb-6">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💔</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t.deleteModal.title}</h3>
              <p className="text-gray-500 mt-2" dangerouslySetInnerHTML={{ __html: t.deleteModal.description(adToDelete?.title).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <p className="text-sm font-semibold text-gray-700 mb-3">{t.deleteModal.question}</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100">
                  <input 
                    type="radio" 
                    name="reason" 
                    value="sold_here" 
                    checked={deleteReason === 'sold_here'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">{t.deleteModal.options.soldHere}</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100">
                  <input 
                    type="radio" 
                    name="reason" 
                    value="sold_elsewhere" 
                    checked={deleteReason === 'sold_elsewhere'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">{t.deleteModal.options.soldElsewhere}</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100">
                  <input 
                    type="radio" 
                    name="reason" 
                    value="just_delete" 
                    checked={deleteReason === 'just_delete'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">{t.deleteModal.options.justDelete}</span>
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
    </div>
  )
}