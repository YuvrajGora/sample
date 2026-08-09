import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);

export type BinRow = {
  id: string;
  bin_id: string;
  address: string;
  zone: string;
  capacity: string;
  last_collected: string;
};

export type House = {
  id: string;
  lane: string;
  house_number: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  qr_url: string | null;
  resident_id: string | null;
  collection_status: string;
  last_collected: string | null;
  created_at: string;
};

export type CollectionLog = {
  id: string;
  house_id: string;
  collected_at: string;
  worker_id: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type PickupSlot = '07:00' | '12:00';
export type PickupStatus = 'scheduled' | 'completed' | 'cancelled';

export type PickupSchedule = {
  id: string;
  house_id: string;
  resident_id?: string | null;
  scheduled_date: string; // YYYY-MM-DD format
  slot: PickupSlot;
  status: PickupStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
};

