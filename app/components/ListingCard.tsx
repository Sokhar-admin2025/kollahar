'use client'

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, BedDouble } from 'lucide-react';
import FavoriteButton from './FavoriteButton';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  images: string[];
  category: string;
  created_at: string;
  user_id?: string;
}

interface ListingCardProps {
  listing: Listing
  currentUserId?: string | null
  onFavoriteRemoved?: (listingId: string) => void
}

export default function ListingCard({ listing, currentUserId, onFavoriteRemoved }: ListingCardProps) {
  // Formatera pris snyggt
  const formattedPrice = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(listing.price);

  const isOwner = Boolean(currentUserId && listing.user_id && listing.user_id === currentUserId);

  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 overflow-hidden flex flex-col h-full">
      
      {/* --- FAVORITKNAPPEN (Ligger helt utanför länken) --- */}
      {!isOwner && (
        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton listingId={listing.id} onFavoriteRemoved={onFavoriteRemoved} />
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
            {listing.category}
          </div>
        </div>

        {/* Innehåll */}
        <div className="p-2 md:p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm md:text-base font-semibold text-brand-text line-clamp-2 group-hover:text-brand-green transition-colors antialiased">
              {listing.title}
            </h3>
          </div>
          
          <div className="mt-auto space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm md:text-base font-bold text-brand-green antialiased">
                {formattedPrice}
              </p>
              <div className="flex items-center text-brand-text/70 text-xs gap-0.5">
                <MapPin className="w-3.5 h-3.5 text-brand-text/70" />
                <span className="truncate max-w-[100px] antialiased">{listing.location}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}