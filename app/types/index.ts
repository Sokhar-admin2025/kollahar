export interface Listing {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  attributes?: Record<string, unknown>;
  images: string[];
  user_id: string;
  status: 'active' | 'sold' | 'deleted';
  deleted_at?: string | null;
  seller_type?: 'private' | 'company';
  company_name?: string;
  external_url?: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  listing?: {
    title: string;
    images: string[];
    price?: number;
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