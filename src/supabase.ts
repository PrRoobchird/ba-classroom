import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './constants';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_KEY && 
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-supabase')
);

export const supabase: SupabaseClient | null = (() => {
  if (!isSupabaseConfigured) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
})();

let sharedBroadcastChannel: RealtimeChannel | null = null;

function getBroadcastChannel(): RealtimeChannel | null {
  if (!supabase) return null;
  if (!sharedBroadcastChannel) {
    try {
      sharedBroadcastChannel = supabase.channel('ba_classroom_broadcast_channel');
      sharedBroadcastChannel.subscribe();
    } catch (err) {
      console.warn('Failed to create broadcast channel:', err);
    }
  }
  return sharedBroadcastChannel;
}

/**
 * Broadcast an instant update event across connected devices via WebSockets
 */
export async function broadcastRemoteChange(key: string, data: unknown): Promise<void> {
  if (!supabase) return;
  try {
    const channel = getBroadcastChannel();
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

  try {
    const channelName = `ba_sub_${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase.channel(channelName);

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
        if (status === 'SUBSCRIBED') {
          console.log('Realtime sync connected successfully');
        }
      });

    return () => {
      try {
        supabase?.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing realtime channel:', e);
      }
    };
  } catch (err) {
    console.warn('Failed to subscribe to realtime changes:', err);
    return () => {};
  }
}
