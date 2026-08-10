import { supabase } from '@/lib/supabase';

export type GreenPointActionType = 'scheduled_pickup_completed' | 'daily_collection' | 'issue_reported';

export interface GreenPointsLedgerItem {
  id: string;
  resident_id: string;
  house_id: string | null;
  points: number;
  action_type: GreenPointActionType | 'bonus_reward';
  description: string;
  reference_id: string;
  created_at: string;
}

export type EcoRankLevel = 'Eco Starter' | 'Eco Guardian' | 'Eco Hero';

export interface EcoRankInfo {
  level: EcoRankLevel;
  badge: string;
  minPoints: number;
  nextPoints: number | null;
  progressPct: number;
}

export function calculateEcoRank(points: number): EcoRankInfo {
  if (points >= 500) {
    return {
      level: 'Eco Hero',
      badge: '🏆 Eco Hero',
      minPoints: 500,
      nextPoints: null,
      progressPct: 100,
    };
  } else if (points >= 100) {
    return {
      level: 'Eco Guardian',
      badge: '🌟 Eco Guardian',
      minPoints: 100,
      nextPoints: 500,
      progressPct: Math.min(100, Math.round(((points - 100) / 400) * 100)),
    };
  } else {
    return {
      level: 'Eco Starter',
      badge: '🌱 Eco Starter',
      minPoints: 0,
      nextPoints: 100,
      progressPct: Math.min(100, Math.round((points / 100) * 100)),
    };
  }
}

/**
 * Safely awards Green Points by calling trusted server-side award_green_points RPC function.
 * The client DOES NOT pass resident_id or points amount; the database derives the trusted resident.
 */
export async function awardGreenPoints(
  actionType: GreenPointActionType,
  referenceId: string,
  houseId?: string
): Promise<{ success: boolean; pointsAwarded?: number; reason?: string }> {
  try {
    const { data, error } = await supabase.rpc('award_green_points', {
      p_action_type: actionType,
      p_reference_id: referenceId,
      p_house_id: houseId || null,
    });

    if (error) {
      console.warn('[GreenPointsService] RPC error:', error.message);
      return { success: false, reason: error.message };
    }

    if (data && typeof data === 'object') {
      const res = data as { success: boolean; points_awarded?: number; reason?: string };
      return {
        success: Boolean(res.success),
        pointsAwarded: res.points_awarded,
        reason: res.reason,
      };
    }

    return { success: false, reason: 'Unknown RPC response' };
  } catch (e: any) {
    console.error('[GreenPointsService] Failed to award green points:', e);
    return { success: false, reason: e?.message || 'Network error' };
  }
}

/**
 * Fetches Green Points balance and recent activity feed for a resident.
 */
export async function fetchResidentGreenPoints(residentId: string): Promise<{
  points: number;
  ledger: GreenPointsLedgerItem[];
  rank: EcoRankInfo;
}> {
  try {
    // 1. Fetch user total points from users table
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('green_points')
      .eq('id', residentId)
      .maybeSingle();

    if (userErr) {
      console.warn('[GreenPointsService] Error fetching user points:', userErr.message);
    }

    const totalPoints = userData?.green_points || 0;

    // 2. Fetch recent points ledger items
    const { data: ledgerData, error: ledgerErr } = await supabase
      .from('green_points_ledger')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ledgerErr) {
      console.warn('[GreenPointsService] Error fetching ledger:', ledgerErr.message);
    }

    return {
      points: totalPoints,
      ledger: (ledgerData as GreenPointsLedgerItem[]) || [],
      rank: calculateEcoRank(totalPoints),
    };
  } catch (e) {
    console.error('[GreenPointsService] Failed to fetch points summary:', e);
    return {
      points: 0,
      ledger: [],
      rank: calculateEcoRank(0),
    };
  }
}

/**
 * Subscribes to real-time changes on green_points_ledger and users table for immediate UI updates.
 */
export function subscribeToGreenPoints(residentId: string, onUpdate: () => void): () => void {
  const channel = supabase
    .channel(`green_points_realtime_${residentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'green_points_ledger',
        filter: `resident_id=eq.${residentId}`,
      },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${residentId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
