'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

// VIKTIGT: Vi skapar klienten utanför komponenten för att slippa varningar
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FavoriteButtonProps {
  listingId: string
  onFavoriteRemoved?: (listingId: string) => void
}

export default function FavoriteButton({ listingId, onFavoriteRemoved }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  // 1. Kolla om den är favorit när sidan laddas
  useEffect(() => {
    const checkStatus = async () => {
      // Hämta inloggad användare
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .single();

      if (data) setIsFavorited(true);
    };

    checkStatus();
  }, [listingId]);

  // 2. Hantera klicket
  const handleToggle = async (e: React.MouseEvent) => {
    // STOPPA klicket från att gå vidare till länken
    e.preventDefault(); 
    e.stopPropagation();

    console.log("Klickade på hjärtat för listing:", listingId);

    // Optimistisk uppdatering (byt färg direkt)
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("Ingen användare inloggad, redirect borde ske här eller visa login-modal");
      setIsFavorited(previousState); // Rulla tillbaka
      // Här kan du lägga till: window.location.href = '/login';
      return;
    }

    try {
      if (previousState) {
        // Ta bort favorit
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        
        // Anropa callback om favoriten togs bort
        if (onFavoriteRemoved) {
          onFavoriteRemoved(listingId);
        }
      } else {
        // Lägg till favorit
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId });
      }
    } catch (error) {
      console.error("Fel vid uppdatering:", error);
      setIsFavorited(previousState); // Rulla tillbaka om det blev fel
    }
  };

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
  );
}