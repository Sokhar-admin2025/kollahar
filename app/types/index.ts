export interface Listing {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  bortskankes?: boolean;
  location: string;
  category: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  engine_hours?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  engine_power?: number | null;
  length_cm?: number | null;
  attributes?: Record<string, unknown>;
  images: string[];
  user_id: string;
  status: 'active' | 'sold' | 'deleted' | 'draft';
  deleted_at?: string | null;
  seller_type?: 'private' | 'company';
  company_name?: string;
  external_url?: string;
  /** Externt ID för inventory sync – unikt per användare */
  external_id?: string | null;
  /** Tidigare pris – sätts vid prissänkning */
  previous_price?: number | null;
  /** När priset senast uppdaterades */
  price_updated_at?: string | null;
  /** E-post för specifik säljare – används för lead-notiser */
  contact_email?: string | null;
  /** Namn på specifik säljare */
  contact_name?: string | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  /** Säljarens account_type – 'company' = dealer, används för lead-kort. */
  seller_account_type?: 'private' | 'company';
  /** Namn på den andra deltagaren (köpare eller säljare – den du chattar med). */
  other_participant_name?: string | null;
  listing?: {
    title: string;
    images: string[];
    price?: number;
    bortskankes?: boolean;
    status?: 'active' | 'sold' | 'deleted';
    deleted_at?: string | null;
  };
  hasUnread?: boolean;
}

export interface Message {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
}