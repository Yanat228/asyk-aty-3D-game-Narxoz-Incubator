/**
 * Auth + progress + history
 * Cloud: Supabase (если задан config)
 * Local: профили в localStorage (для демо без ключей)
 */
import { ASYK_CONFIG, isCloudEnabled } from './config.js';

const LOCAL_USERS_KEY = 'asyk_users_v1';
const LOCAL_SESSION_KEY = 'asyk_session_v1';
const HISTORY_LIMIT = 50;

let supabase = null;
let currentUser = null; // { id, email, name }

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return Boolean(currentUser);
}

async function initSupabase() {
  if (!isCloudEnabled()) return null;
  if (supabase) return supabase;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(ASYK_CONFIG.supabaseUrl, ASYK_CONFIG.supabaseAnonKey);
    return supabase;
  } catch (e) {
    console.warn('Supabase init fail', e);
    return null;
  }
}

function loadLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return 'h' + Math.abs(h);
}

/** Restore session on boot */
export async function restoreSession() {
  await initSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const u = data.session.user;
        currentUser = {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || (u.email || '').split('@')[0] || 'Игрок',
          cloud: true,
        };
        return currentUser;
      }
    } catch (e) {
      console.warn(e);
    }
  }
  // local session
  try {
    const sid = localStorage.getItem(LOCAL_SESSION_KEY);
    if (sid) {
      const users = loadLocalUsers();
      const u = users[sid];
      if (u) {
        currentUser = { id: sid, email: u.email, name: u.name, cloud: false };
        return currentUser;
      }
    }
  } catch (_) {}
  return null;
}

export async function register(email, password, name) {
  email = (email || '').trim().toLowerCase();
  name = (name || '').trim() || email.split('@')[0] || 'Игрок';
  if (!email || !password || password.length < 4) {
    throw new Error('Email и пароль (мин. 4 символа) обязательны');
  }

  await initSupabase();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    const u = data.user;
    if (!u) throw new Error('Не удалось создать аккаунт');
    currentUser = { id: u.id, email: u.email, name, cloud: true };
    return currentUser;
  }

  // local
  const users = loadLocalUsers();
  if (users[email]) throw new Error('Такой email уже зарегистрирован');
  users[email] = {
    email,
    name,
    pass: simpleHash(password),
    progress: defaultProgress(),
    history: [],
  };
  saveLocalUsers(users);
  localStorage.setItem(LOCAL_SESSION_KEY, email);
  currentUser = { id: email, email, name, cloud: false };
  return currentUser;
}

export async function login(email, password) {
  email = (email || '').trim().toLowerCase();
  if (!email || !password) throw new Error('Введи email и пароль');

  await initSupabase();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const u = data.user;
    currentUser = {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || email.split('@')[0],
      cloud: true,
    };
    return currentUser;
  }

  const users = loadLocalUsers();
  const u = users[email];
  if (!u || u.pass !== simpleHash(password)) throw new Error('Неверный email или пароль');
  localStorage.setItem(LOCAL_SESSION_KEY, email);
  currentUser = { id: email, email, name: u.name, cloud: false };
  return currentUser;
}

export async function logout() {
  await initSupabase();
  if (supabase) {
    try { await supabase.auth.signOut(); } catch (_) {}
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
  currentUser = null;
}

function defaultProgress() {
  return {
    stars: {},
    unlocked: [1],
    coins: 20,
    gems: 0,
    skins: ['classic'],
    activeSkin: 'classic',
    upgrades: { force: 0, precision: 0, strength: 0, size: 0 },
    played: false,
  };
}

/** Read progress for current user (or guest keys) */
export async function loadProgress() {
  // Гость — всегда чистый старт
  if (!currentUser) {
    return defaultProgress();
  }

  await initSupabase();
  if (supabase && currentUser.cloud) {
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (!error && data) {
        return {
          stars: data.stars || {},
          unlocked: data.unlocked || [1],
          coins: data.coins ?? 20,
          gems: data.gems ?? 0,
          skins: data.skins || ['classic'],
          activeSkin: data.active_skin || 'classic',
          upgrades: data.upgrades || { force: 0, precision: 0, strength: 0, size: 0 },
          played: Boolean(data.played),
        };
      }
    } catch (e) {
      console.warn('loadProgress cloud', e);
    }
  }

  // local profile progress
  const users = loadLocalUsers();
  const u = users[currentUser.id];
  if (u?.progress) return { ...defaultProgress(), ...u.progress };
  return defaultProgress();
}

/** Save full progress blob */
export async function saveProgressCloud(progress) {
  // Не пишем в общие ключи — только профиль пользователя
  if (!currentUser) return;

  const users = loadLocalUsers();
  if (users[currentUser.id]) {
    users[currentUser.id].progress = {
      stars: progress.stars,
      unlocked: progress.unlocked,
      coins: progress.coins,
      gems: progress.gems || 0,
      skins: progress.skins,
      activeSkin: progress.activeSkin,
      upgrades: progress.upgrades || { force: 0, precision: 0, strength: 0, size: 0 },
      played: progress.played,
    };
    saveLocalUsers(users);
  }

  await initSupabase();
  if (supabase && currentUser.cloud) {
    try {
      await supabase.from('progress').upsert({
        user_id: currentUser.id,
        stars: progress.stars,
        unlocked: progress.unlocked,
        coins: progress.coins,
        gems: progress.gems || 0,
        skins: progress.skins,
        active_skin: progress.activeSkin,
        upgrades: progress.upgrades || {},
        played: progress.played,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('saveProgress cloud', e);
    }
  }
}

/** Append result to history */
export async function pushResult(entry) {
  // entry: { level, score, stars, win, mode, player }
  const row = {
    ...entry,
    at: new Date().toISOString(),
  };

  if (!currentUser) {
    const hist = JSON.parse(localStorage.getItem('asyk_history') || '[]');
    hist.unshift(row);
    localStorage.setItem('asyk_history', JSON.stringify(hist.slice(0, HISTORY_LIMIT)));
    return;
  }

  const users = loadLocalUsers();
  if (users[currentUser.id]) {
    users[currentUser.id].history = users[currentUser.id].history || [];
    users[currentUser.id].history.unshift(row);
    users[currentUser.id].history = users[currentUser.id].history.slice(0, HISTORY_LIMIT);
    // update bests
    const best = users[currentUser.id].best || {};
    const lid = String(entry.level);
    if (!best[lid] || entry.score > best[lid].score || entry.stars > (best[lid].stars || 0)) {
      best[lid] = { score: entry.score, stars: entry.stars };
    }
    users[currentUser.id].best = best;
    saveLocalUsers(users);
  }

  await initSupabase();
  if (supabase && currentUser.cloud) {
    try {
      await supabase.from('results').insert({
        user_id: currentUser.id,
        level: entry.level,
        score: entry.score,
        stars: entry.stars,
        win: entry.win,
        mode: entry.mode || 1,
        created_at: row.at,
      });
    } catch (e) {
      console.warn('pushResult cloud', e);
    }
  }
}

export async function getHistory() {
  if (!currentUser) {
    return JSON.parse(localStorage.getItem('asyk_history') || '[]');
  }
  await initSupabase();
  if (supabase && currentUser.cloud) {
    try {
      const { data } = await supabase
        .from('results')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      if (data) {
        return data.map(r => ({
          level: r.level,
          score: r.score,
          stars: r.stars,
          win: r.win,
          mode: r.mode,
          at: r.created_at,
        }));
      }
    } catch (e) {
      console.warn(e);
    }
  }
  const users = loadLocalUsers();
  return users[currentUser.id]?.history || [];
}

export async function getRecords() {
  // personal best per level
  const hist = await getHistory();
  const best = {};
  hist.forEach(h => {
    const lid = String(h.level);
    if (!best[lid] || h.score > best[lid].score || (h.stars || 0) > (best[lid].stars || 0)) {
      best[lid] = { score: h.score, stars: h.stars || 0 };
    }
  });
  // merge local profile bests
  if (currentUser) {
    const users = loadLocalUsers();
    const b = users[currentUser.id]?.best || {};
    Object.keys(b).forEach(k => {
      if (!best[k] || b[k].score > best[k].score) best[k] = b[k];
    });
  }
  return best;
}
