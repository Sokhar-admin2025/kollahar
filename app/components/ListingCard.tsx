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
}

export default function ListingCard({ listing }: { listing: Listing }) {
  // Formatera pris snyggt
  const formattedPrice = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(listing.price);

  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 overflow-hidden flex flex-col h-full">
      
      {/* --- FAVORITKNAPPEN (Ligger helt utanför länken) --- */}
      <div className="absolute top-3 right-3 z-50">
        <FavoriteButton listingId={listing.id} />
      </div>

      {/* --- LÄNKEN (Ligger bredvid, som ett syskon) --- */}
      <Link href={`/annons/${listing.id}`} className="block flex-1 flex flex-col">
        {/* Bild-container */}
        <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
          {listing.images && listing.images[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Ingen bild
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700">
            {listing.category}
          </div>
        </div>

        {/* Innehåll */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {listing.title}
            </h3>
          </div>
          
          <div className="mt-auto space-y-2">
            <p className="text-lg font-bold text-blue-600">
              {formattedPrice}
              <span className="text-xs font-normal text-gray-500 ml-1">/mån</span>
            </p>
            
            <div className="flex items-center text-gray-500 text-sm gap-4 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[100px]">{listing.location}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}