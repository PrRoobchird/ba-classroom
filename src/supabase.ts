import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './constants';
import { Round, DatabaseStudent, User } from './types';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_KEY && 
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-supabase')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

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
      // Table might not exist yet or permission denied
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
 * Upsert a JSON state into the 'app_state' table in Supabase
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
    return true;
  } catch (err) {
    console.warn(`Supabase save error for ${key}:`, err);
    return false;
  }
}
