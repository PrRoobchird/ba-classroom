import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './constants';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_KEY && 
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-supabase')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

let sharedRealtimeChannel: RealtimeChannel | null = null;

export function getRealtimeChannel(): RealtimeChannel | null {
  if (!supabase) return null;
  if (!sharedRealtimeChannel) {
    sharedRealtimeChannel = supabase.channel('ba_classroom_live_sync');
  }
  return sharedRealtimeChannel;
}

/**
 * Broadcast an instant update event across connected devices via WebSockets
 */
export async function broadcastRemoteChange(key: string, data: unknown): Promise<void> {
  if (!supabase) return;
  try {
    const channel = getRealtimeChannel();
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'state_changed',
        payload: { key, data, timestamp: Date.now() },
      });
    }
  } catch (err) {
    console.warn('Realtime broadcast error:', err);
  }
}

/**
 * Fetch a saved JSON state from the 'app_state' table in Supabase
 */
export async function fetchRemoteState<T>(key: string): Promise<T | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.warn(`Supabase load notice for ${key}:`, error.message);
      return null;
    }
    return (data?.data as T) ?? null;
  } catch (err) {
    console.warn(`Supabase fetch error for ${key}:`, err);
    return null;
  }
}

/**
 * Upsert a JSON state into the 'app_state' table in Supabase and broadcast to all connected devices
 */
export async function saveRemoteState(key: string, value: unknown): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('app_state')
      .upsert(
        {
          key,
          data: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn(`Supabase save notice for ${key}:`, error.message);
      return false;
    }

    // Broadcast instant update to all connected clients over WebSocket
    broadcastRemoteChange(key, value);
    return true;
  } catch (err) {
    console.warn(`Supabase save error for ${key}:`, err);
    return false;
  }
}

/**
 * Subscribe to realtime updates from other devices via WebSocket Broadcast and Postgres CDC
 */
export function subscribeToRealtimeChanges(
  onRemoteChange: (key: string, data: unknown) => void
): () => void {
  if (!supabase) return () => {};

  const channel = getRealtimeChannel();
  if (!channel) return () => {};

  channel
    .on('broadcast', { event: 'state_changed' }, (payload) => {
      if (payload.payload?.key) {
        onRemoteChange(payload.payload.key, payload.payload.data);
      }
    })
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state' },
      (payload) => {
        const record = (payload.new || {}) as { key?: string; data?: unknown };
        if (record.key && record.data) {
          onRemoteChange(record.key, record.data);
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime sync connection status:', status);
    });

  return () => {
    // Keep channel alive for app lifetime
  };
}
