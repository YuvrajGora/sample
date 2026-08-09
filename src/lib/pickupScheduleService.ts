import { supabase, type PickupSchedule, type PickupSlot } from '@/lib/supabase';

const STORAGE_KEY = 'cleanos_pickup_schedules_cache';

// Helper to load fallback cache
function getLocalCache(): PickupSchedule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper to save fallback cache
function setLocalCache(schedules: PickupSchedule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (err) {
    console.warn('[pickupScheduleService] Local cache write error:', err);
  }
}

// Check if a time slot for a given YYYY-MM-DD has already passed
export function isSlotPassed(dateStr: string, slot: PickupSlot): boolean {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // If scheduled date is in the past
  if (dateStr < todayStr) return true;
  // If scheduled date is in the future
  if (dateStr > todayStr) return false;

  // If date is today, check current hour
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  if (slot === '07:00') {
    return currentHour > 7 || (currentHour === 7 && currentMinute > 0);
  }
  if (slot === '12:00') {
    return currentHour > 12 || (currentHour === 12 && currentMinute > 0);
  }
  return false;
}

/**
 * Fetch schedules from Supabase DB with synchronized local cache fallback
 */
export async function fetchSchedules(dateStr?: string, houseId?: string): Promise<PickupSchedule[]> {
  try {
    let query = supabase.from('pickup_schedules').select('*');
    if (dateStr) query = query.eq('scheduled_date', dateStr);
    if (houseId) query = query.eq('house_id', houseId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      // Sync cache
      const cached = getLocalCache();
      const mergedMap = new Map<string, PickupSchedule>();
      cached.forEach((item) => mergedMap.set(item.id, item));
      (data as PickupSchedule[]).forEach((item) => mergedMap.set(item.id, item));
      const merged = Array.from(mergedMap.values());
      setLocalCache(merged);
      return (data as PickupSchedule[]);
    }
  } catch (err) {
    console.warn('[pickupScheduleService] Supabase fetch fallback to cache:', err);
  }

  // Fallback to cache
  let cached = getLocalCache();
  if (dateStr) cached = cached.filter((s) => s.scheduled_date === dateStr);
  if (houseId) cached = cached.filter((s) => s.house_id === houseId);
  return cached;
}

/**
 * Get active scheduled pickup for a house on a given date
 */
export async function fetchActiveScheduleForHouse(houseId: string, dateStr: string): Promise<PickupSchedule | null> {
  const list = await fetchSchedules(dateStr, houseId);
  return list.find((s) => s.status === 'scheduled') || null;
}

/**
 * Create a new pickup schedule with real-time validation
 */
export async function createSchedule(params: {
  houseId: string;
  residentId?: string;
  date: string;
  slot: PickupSlot;
  notes?: string;
}): Promise<{ data?: PickupSchedule; error?: string }> {
  // 1. Strict Slot restriction
  if (params.slot !== '07:00' && params.slot !== '12:00') {
    return { error: 'Invalid time slot. Only 7:00 AM and 12:00 PM are available.' };
  }

  // 2. Date validation (no past dates)
  const todayStr = new Date().toISOString().split('T')[0];
  if (params.date < todayStr) {
    return { error: 'Cannot schedule pickups for past dates.' };
  }

  // 3. Check if slot has already passed for today
  if (isSlotPassed(params.date, params.slot)) {
    const slotTimeLabel = params.slot === '07:00' ? '7:00 AM' : '12:00 PM';
    return { error: `The ${slotTimeLabel} slot for today has already passed. Please select a future slot.` };
  }

  // 4. Duplicate active booking check
  const activeExisting = await fetchActiveScheduleForHouse(params.houseId, params.date);
  if (activeExisting) {
    return {
      error: `House ${params.houseId} already has an active pickup scheduled for ${params.date} at ${
        activeExisting.slot === '07:00' ? '7:00 AM' : '12:00 PM'
      }. Cancel or reschedule it first.`,
    };
  }

  const newSchedule: PickupSchedule = {
    id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    house_id: params.houseId,
    resident_id: params.residentId || null,
    scheduled_date: params.date,
    slot: params.slot,
    status: 'scheduled',
    notes: params.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    cancelled_at: null,
  };

  // Attempt DB Insert
  try {
    const { data, error } = await supabase.from('pickup_schedules').insert({
      house_id: params.houseId,
      resident_id: params.residentId || null,
      scheduled_date: params.date,
      slot: params.slot,
      status: 'scheduled',
      notes: params.notes || null,
    }).select().maybeSingle();

    if (!error && data) {
      const created = data as PickupSchedule;
      const cached = getLocalCache();
      setLocalCache([created, ...cached.filter((c) => c.id !== created.id)]);
      notifyRealtimeListeners();
      return { data: created };
    }
  } catch (err) {
    console.warn('[pickupScheduleService] DB Insert fallback to cache:', err);
  }

  // Save to synchronized local cache if DB table is unavailable
  const cached = getLocalCache();
  setLocalCache([newSchedule, ...cached]);
  notifyRealtimeListeners();
  return { data: newSchedule };
}

/**
 * Cancel an existing pickup schedule
 */
export async function cancelSchedule(scheduleId: string): Promise<{ data?: PickupSchedule; error?: string }> {
  const cached = getLocalCache();
  const target = cached.find((s) => s.id === scheduleId);

  const nowIso = new Date().toISOString();

  // DB Update attempt
  try {
    const { data, error } = await supabase
      .from('pickup_schedules')
      .update({ status: 'cancelled', cancelled_at: nowIso, updated_at: nowIso })
      .eq('id', scheduleId)
      .select()
      .maybeSingle();

    if (!error && data) {
      const updated = data as PickupSchedule;
      setLocalCache(cached.map((c) => (c.id === scheduleId ? updated : c)));
      notifyRealtimeListeners();
      return { data: updated };
    }
  } catch (err) {
    console.warn('[pickupScheduleService] DB cancel fallback:', err);
  }

  // Cache fallback
  if (target) {
    const updated: PickupSchedule = {
      ...target,
      status: 'cancelled',
      cancelled_at: nowIso,
      updated_at: nowIso,
    };
    setLocalCache(cached.map((c) => (c.id === scheduleId ? updated : c)));
    notifyRealtimeListeners();
    return { data: updated };
  }

  return { error: 'Schedule record not found.' };
}

/**
 * Reschedule an existing pickup
 */
export async function rescheduleSchedule(
  scheduleId: string,
  newDate: string,
  newSlot: PickupSlot,
): Promise<{ data?: PickupSchedule; error?: string }> {
  // Cancel old schedule
  const cancelRes = await cancelSchedule(scheduleId);
  if (cancelRes.error) return cancelRes;

  const target = cancelRes.data;
  if (!target) return { error: 'Failed to locate target schedule.' };

  // Create new schedule
  return createSchedule({
    houseId: target.house_id,
    residentId: target.resident_id || undefined,
    date: newDate,
    slot: newSlot,
    notes: target.notes || undefined,
  });
}

/**
 * Mark active schedule as completed when worker scans/collects house waste
 */
export async function completeScheduleForHouse(houseId: string, dateStr?: string): Promise<void> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  try {
    await supabase
      .from('pickup_schedules')
      .update({ status: 'completed', completed_at: nowIso, updated_at: nowIso })
      .eq('house_id', houseId)
      .eq('scheduled_date', targetDate)
      .eq('status', 'scheduled');
  } catch (err) {
    console.warn('[pickupScheduleService] Complete schedule DB update fallback:', err);
  }

  // Update local cache
  const cached = getLocalCache();
  const updated = cached.map((s) => {
    if (s.house_id === houseId && s.scheduled_date === targetDate && s.status === 'scheduled') {
      return { ...s, status: 'completed' as const, completed_at: nowIso, updated_at: nowIso };
    }
    return s;
  });
  setLocalCache(updated);
  notifyRealtimeListeners();
}

// Listener callback system for UI reactivity across components and browser tabs
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyRealtimeListeners() {
  listeners.forEach((fn) => fn());
}

/**
 * Subscribe to realtime schedule updates
 */
export function subscribeToPickupSchedules(callback: () => void): () => void {
  listeners.add(callback);

  // Subscribe to Supabase Postgres Realtime changes if available
  const channel = supabase
    .channel('cleanos_pickup_schedules_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_schedules' }, () => {
      callback();
    })
    .subscribe();

  // Listen to window storage events for multi-tab synchronization
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    supabase.removeChannel(channel);
  };
}
