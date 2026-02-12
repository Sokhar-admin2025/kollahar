'use client'

import Link from 'next/link';
import Image from 'next/image';
import FavoriteButton from './FavoriteButton';
import { getCategoryLabel, CATEGORY_GROUPS } from '@/lib/categories';

interface Listing {
  id: string;
  title: string;
  price: number;
  bortskankes?: boolean;
  location: string;
  images: string[];
  category: string;
  created_at: string;
  user_id?: string;
  attributes?: Record<string, unknown>;
  seller_type?: 'private' | 'company';
}

interface ListingCardProps {
  listing: Listing
  currentUserId?: string | null
  /** Om true visas hjärtat som fyllt (ingen N+1: skicka från servern t.ex. favoriteIds.includes(listing.id)) */
  isFavorited?: boolean
  onFavoriteRemoved?: (listingId: string) => void
  /** 'grid' = kortvy (default), 'list' = radvy med bild till vänster */
  layout?: 'grid' | 'list'
  /** Index för alternerande radbakgrund i listvy */
  listIndex?: number
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Idag'
  if (days === 1) return 'Igår'
  if (days < 7) return `${days} dagar sedan`
  if (days < 30) return `${Math.floor(days / 7)} vecka sedan`
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export default function ListingCard({
  listing,
  currentUserId,
  isFavorited: isFavoritedProp,
  onFavoriteRemoved,
  layout = 'grid',
  listIndex = 0,
}: ListingCardProps) {
  const isBortskankes = Boolean(listing.bortskankes)
  const formattedPrice = isBortskankes ? 'Bortskänkes' : new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(listing.price);

  const isOwner = Boolean(currentUserId && listing.user_id && listing.user_id === currentUserId);
  
  // Kontrollera om kategorin tillhör "Fordon"-gruppen
  const vehiclesGroup = CATEGORY_GROUPS.find(group => group.id === 'vehicles')
  const isVehicleCategory = vehiclesGroup?.children.some(child => child.id === listing.category) ?? false
  
  // Extrahera bara kommunen från location (t.ex. "Täby, Stockholms län" → "Täby")
  const displayLocation = listing.location.includes(',')
    ? listing.location.split(',')[0].trim()
    : listing.location
  const isCompany = listing.seller_type === 'company'
  const locationLabel = displayLocation
    ? (isCompany ? `Företag i ${displayLocation}` : displayLocation)
    : (isCompany ? 'Företag' : '')
  
  // Bil-specifik data (defensiv kodning)
  const isCarsCategory = listing.category === 'cars';
  const attributes = listing.attributes || {};
  
  // Extrahera bil-specifika värden säkert
  const carYear = typeof attributes.year === 'number' ? attributes.year : 
                  typeof attributes.year === 'string' ? parseInt(attributes.year) : null;
  const carMileage = typeof attributes.mileage === 'number' ? attributes.mileage :
                     typeof attributes.mileage === 'string' ? parseInt(attributes.mileage) : null;
  const carGearbox = typeof attributes.gearbox === 'string' ? attributes.gearbox : null;
  const carFuel = typeof attributes.fuel === 'string' ? attributes.fuel : null;
  
  // Formatera miltal med mellanslag (t.ex. "45 000 mil")
  const formattedMileage = carMileage ? new Intl.NumberFormat('sv-SE').format(carMileage) + ' mil' : null;
  
  // Bygg specifikationssträng för bilar
  const carSpecs: string[] = [];
  if (carYear) carSpecs.push(String(carYear));
  if (formattedMileage) carSpecs.push(formattedMileage);
  if (carGearbox) carSpecs.push(carGearbox);
  if (carFuel) carSpecs.push(carFuel);
  
  const carSpecsString = carSpecs.join(' • ');
  
  // Kontrollera om skick är extremt (Ny eller Renoveringsobjekt/Defekt) - endast för icke-fordon
  const carCondition = !isVehicleCategory && typeof attributes.condition === 'string' ? attributes.condition : null;
  const isExtremeCondition = carCondition === 'Ny' || carCondition === 'Defekt';

  if (layout === 'list') {
    const isEvenRow = listIndex % 2 === 0
    return (
      <div
        className={`group overflow-hidden border-b border-gray-100 last:border-b-0 transition-colors ${
          isEvenRow ? 'bg-white' : 'bg-gray-50/60'
        } hover:bg-brand-beige/30`}
      >
        <div
          className="grid items-center gap-x-3 py-2 px-3 text-left
            grid-cols-[56px_minmax(0,1fr)_0_0_0_100px_48px]
            md:grid-cols-[56px_minmax(0,1fr)_0_6rem_0_100px_48px]
            lg:grid-cols-[56px_minmax(0,1fr)_5rem_6rem_0_100px_48px]
            xl:grid-cols-[56px_minmax(0,1fr)_5rem_6rem_5rem_100px_48px]
            md:gap-x-4"
        >
          {/* Bild */}
          <Link href={`/annons/${listing.id}`} className="block col-start-1">
            <div className="relative w-14 h-14 rounded-md overflow-hidden bg-brand-beige">
              {listing.images && listing.images[0] ? (
                <Image
                  src={listing.images[0]}
                  alt={listing.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  quality={75}
                  sizes="56px"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-[10px]">
                  —
                </div>
              )}
            </div>
          </Link>

          {/* Titel + specs */}
          <Link href={`/annons/${listing.id}`} className="min-w-0 col-start-2">
            <div className="flex flex-col min-w-0 gap-0.5">
              <h3 className="text-sm font-medium text-brand-text line-clamp-1 group-hover:text-brand-green transition-colors antialiased">
                {listing.title}
              </h3>
              {(carSpecsString || !isVehicleCategory) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {isCarsCategory && carSpecsString && (
                    <span className="text-[11px] font-medium text-brand-text/60 antialiased">{carSpecsString}</span>
                  )}
                  {!isVehicleCategory && isExtremeCondition && carCondition && (
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                        carCondition === 'Ny' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {carCondition}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>

          {/* Kategori – lg+ */}
          <Link href={`/annons/${listing.id}`} className="hidden lg:block overflow-hidden min-w-0 col-start-3">
            <span className="text-[11px] font-medium text-brand-text/60 antialiased truncate block">
              {getCategoryLabel(listing.category)}
            </span>
          </Link>

          {/* Plats – md+ */}
          {locationLabel && (
            <Link href={`/annons/${listing.id}`} className="hidden md:block overflow-hidden min-w-0 col-start-4">
              <span className="text-[11px] font-medium text-brand-text/60 truncate antialiased">{locationLabel}</span>
            </Link>
          )}

          {/* Datum – xl+ */}
          <Link href={`/annons/${listing.id}`} className="hidden xl:block overflow-hidden min-w-0 col-start-5">
            <span className="text-[11px] font-medium text-brand-text/50 antialiased">
              {formatRelativeDate(listing.created_at)}
            </span>
          </Link>

          {/* Pris / Bortskänkes – egen kolumn med utrymme före favorit */}
          <Link href={`/annons/${listing.id}`} className="overflow-hidden min-w-0 col-start-6">
            {isBortskankes ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green font-medium inline-block">
                Bortskänkes
              </span>
            ) : (
              <span className="text-sm font-semibold text-brand-green antialiased">{formattedPrice}</span>
            )}
          </Link>

          {/* Favorit – egen kolumn, ingen överlappning */}
          <div className="flex justify-center col-start-7 pl-1">
            {!isOwner ? (
              <FavoriteButton
                listingId={listing.id}
                isFavorited={isFavoritedProp}
                onFavoriteRemoved={onFavoriteRemoved}
              />
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 overflow-hidden flex flex-col h-full">
      
      {/* --- FAVORITKNAPPEN (Ligger helt utanför länken) --- */}
      {!isOwner && (
        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton
            listingId={listing.id}
            isFavorited={isFavoritedProp}
            onFavoriteRemoved={onFavoriteRemoved}
          />
        </div>
      )}

      {/* --- LÄNKEN (Ligger bredvid, som ett syskon) --- */}
      <Link href={`/annons/${listing.id}`} className="block flex-1 flex flex-col">
        {/* Bild-container */}
        <div className="relative aspect-[4/3] w-full bg-brand-beige overflow-hidden">
          {listing.images && listing.images[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              quality={90}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Ingen bild
            </div>
          )}
          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[10px] md:text-xs font-medium text-gray-700">
            {getCategoryLabel(listing.category)}
          </div>
        </div>

        {/* Innehåll */}
        <div className="p-2 md:p-4 flex flex-col flex-1">
          {/* Titel och extremt skick-badge (endast för icke-fordon) */}
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="text-sm md:text-base font-semibold text-brand-text line-clamp-2 group-hover:text-brand-green transition-colors antialiased flex-1">
              {listing.title}
            </h3>
            {!isVehicleCategory && isExtremeCondition && carCondition && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                carCondition === 'Ny' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {carCondition}
              </span>
            )}
          </div>
          
          {/* Bil-specifikationer (endast för bilar) */}
          {isCarsCategory && carSpecsString && (
            <p className="text-xs text-brand-text/70 mb-2 antialiased">
              {carSpecsString}
            </p>
          )}
          
          <div className="mt-auto space-y-1">
            {/* Pris på egen rad, högerställt */}
            <p className="text-sm md:text-base font-bold text-brand-green antialiased text-right">
              {formattedPrice}
            </p>
            {/* Plats */}
            {locationLabel && (
              <div className="text-brand-text/70 text-xs">
                <span className="truncate max-w-[100px] antialiased">{locationLabel}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}