// ─────────────────────────────────────────────
// Supabase config
// Создай проект на https://supabase.com → Settings → API
// Вставь URL и anon key сюда. Пока пусто — работает локальный режим.
// ─────────────────────────────────────────────
export const ASYK_CONFIG = {
  supabaseUrl: '',   // например: 'https://xxxxx.supabase.co'
  supabaseAnonKey: '', // например: 'eyJhbGciOi...'
};

export function isCloudEnabled() {
  return Boolean(ASYK_CONFIG.supabaseUrl && ASYK_CONFIG.supabaseAnonKey);
}
