'use client'

import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { getCategoryLabel, CATEGORY_GROUPS } from '@/lib/categories';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  images: string[];
  category: string;
  created_at: string;
  user_id?: string;
  attributes?: Record<string, unknown>;
}

interface ListingCardProps {
  listing: Listing
  currentUserId?: string | null
  /** Om true visas hjärtat som fyllt (ingen N+1: skicka från servern t.ex. favoriteIds.includes(listing.id)) */
  isFavorited?: boolean
  onFavoriteRemoved?: (listingId: string) => void
}

export default function ListingCard({
  listing,
  currentUserId,
  isFavorited: isFavoritedProp,
  onFavoriteRemoved,
}: ListingCardProps) {
  // Formatera pris snyggt
  const formattedPrice = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(listing.price);

  const isOwner = Boolean(currentUserId && listing.user_id && listing.user_id === currentUserId);
  
  // Kontrollera om kategorin tillhör "Fordon"-gruppen
  const vehiclesGroup = CATEGORY_GROUPS.find(group => group.id === 'vehicles')
  const isVehicleCategory = vehiclesGroup?.children.some(child => child.id === listing.category) ?? false
  
  // Extrahera bara kommunen från location (t.ex. "Täby, Stockholms län" → "Täby")
  // Om location innehåller komma, ta första delen (kommunen), annars visa hela strängen
  const displayLocation = listing.location.includes(',') 
    ? listing.location.split(',')[0].trim()
    : listing.location
  
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
            <div className="flex items-center text-brand-text/70 text-xs gap-0.5">
              <MapPin className="w-3.5 h-3.5 text-brand-text/70" />
              <span className="truncate max-w-[100px] antialiased">{displayLocation}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}