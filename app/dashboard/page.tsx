'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Settings, LogOut, Edit, Trash2 } from 'lucide-react'

import { DASHBOARD_TEXTS } from '../lib/content'
import Button from '../components/atoms/Button'
import ListingCard from '../components/ListingCard'
import Header from '../components/organisms/Header'
import ScrollToSearch from '../components/ScrollToSearch'
import type { Listing } from '../types'
import { messageService } from '../services/messageService'

const supabase = createClient()

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Laddar...</div>}>
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
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
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

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

      // Kolla om användaren har olästa meddelanden
      try {
        const unreadSet = await messageService.getUnreadConversationIds(user.id)
        setHasUnreadMessages(unreadSet.size > 0)
      } catch (err) {
        console.error('Kunde inte hämta olästa meddelanden:', err)
        setHasUnreadMessages(false)
      }

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
    router.push('/')
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
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <Header />
      
      <div className="p-6 relative flex-grow">
        <div id="dashboard-header" className="mx-auto max-w-4xl mb-8">
          <h1 className="text-3xl font-display text-brand-green mb-2">{t.header.title}</h1>
          <p className="text-brand-text antialiased">{t.header.welcome} <span className="font-semibold">{user?.email}</span></p>
        </div>
        
        <div className="mx-auto max-w-4xl mb-6 flex items-center gap-4 justify-end">
          {/* Meddelanden */}
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

          {/* Inställningar */}
          <Link href="/dashboard/settings" title="Inställningar">
            <div className="p-2 text-brand-text hover:text-brand-green hover:bg-brand-green/10 rounded-full transition cursor-pointer">
              <Settings size={24} />
            </div>
          </Link>

          {/* Logga ut */}
          <Button variant="link" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut size={18} />
            {t.header.logout}
          </Button>
        </div>

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

        {/* FLIKAR + länk till annonssidan */}
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
              Sparade annonser ({favoriteAds.length})
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

        {/* AKTIVA ANNONSER */}
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
                    onClick={() => router.push(`/annons/${ad.id}`)}
                    className="group flex gap-4 p-4 border rounded-xl hover:bg-brand-beige transition cursor-pointer relative"
                  >
                    <div className="h-20 w-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                      {ad.images && ad.images[0] ? (
                        <img src={ad.images[0]} alt={ad.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-brand-text text-xs antialiased">{t.listing.noImage}</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg text-brand-text antialiased flex-1">{ad.title}</h3>
                        {/* KNAPPAR: Redigera & Radera - i höjd med Aktiv-taggen */}
                        <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* 1. Redigera-knapp (Penna) */}
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

                          {/* 2. Soptunnan */}
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
                        <p className="text-brand-text text-sm font-semibold antialiased">{ad.price} kr</p>
                        <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800">{t.listing.activeLabel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORIK (UPPDATERAD TABELL - Status borttagen, datum tillagt) */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {soldAds.length === 0 ? (
              <div className="p-10 text-center text-brand-text">
                <p className="antialiased">{t.emptyStates.history}</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 md:mx-0">
                <div className="min-w-full inline-block">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-text uppercase bg-brand-beige border-b">
                      <tr>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.datePublished}</th>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.title}</th>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.price}</th>
                        <th className="px-4 md:px-6 py-3 whitespace-nowrap">{t.listing.historyHeaders.dateSold}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soldAds.map((ad) => (
                        <tr key={ad.id} className="bg-white border-b hover:bg-brand-beige/50">
                          {/* 1. SKAPAD DATUM */}
                          <td className="px-4 md:px-6 py-4 text-brand-text antialiased whitespace-nowrap">
                            {new Date(ad.created_at).toLocaleDateString()}
                          </td>
                          
                          {/* 2. TITEL */}
                          <td className="px-4 md:px-6 py-4 font-medium text-brand-text antialiased">
                            {ad.title}
                          </td>
                          
                          {/* 3. PRIS */}
                          <td className="px-4 md:px-6 py-4 text-brand-text antialiased whitespace-nowrap">
                            {ad.price} kr
                          </td>
                          
                          {/* 4. SÅLD DATUM (Status-texten borttagen) */}
                          <td className="px-4 md:px-6 py-4 text-brand-text antialiased whitespace-nowrap">
                            {ad.deleted_at ? new Date(ad.deleted_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAVORITER */}
        {activeTab === 'favorites' && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            {favoriteAds.length === 0 ? (
              <div className="text-center py-10 text-brand-text bg-brand-beige rounded-xl border border-dashed border-gray-300">
                <p>Du har inte sparat några annonser än.</p>
                <Link href="/" className="text-brand-green underline mt-2 inline-block hover:text-brand-green/80">
                  Till startsidan
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {favoriteAds.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    currentUserId={user?.id ?? null}
                    onFavoriteRemoved={(listingId) => {
                      setFavoriteAds(prev => prev.filter(ad => ad.id !== listingId))
                    }}
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
              <p className="text-brand-text mt-2 antialiased" dangerouslySetInnerHTML={{ __html: t.deleteModal.description(adToDelete?.title).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
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

      {/* Scroll to Search-knapp */}
      <ScrollToSearch heroElementId="dashboard-header" />
    </div>
  )
}