const RECENT_CHAT_KEY = 'pank_recent_conversations_v1';
const CHAT_HISTORY_PREFIX = 'pank_chat_history_v1:';
const CHAT_START_CACHE_KEY = 'pank_chat_start_cache_v1';
const CHAT_PENDING_PLAN_CACHE_KEY = 'pank_chat_pending_plan_v1';
const CHAT_STORAGE_MIGRATION_KEY = 'pank_chat_storage_migrated_to_local_v1';

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const migrateConversationStorageToLocal = () => {
  if (!canUseLocalStorage() || !canUseSessionStorage()) return;

  const local = window.localStorage;
  const session = window.sessionStorage;

  if (local.getItem(CHAT_STORAGE_MIGRATION_KEY) === '1') return;

  const directKeys = [RECENT_CHAT_KEY, CHAT_START_CACHE_KEY, CHAT_PENDING_PLAN_CACHE_KEY];
  directKeys.forEach((key) => {
    const sessionValue = session.getItem(key);
    if (sessionValue !== null && local.getItem(key) === null) {
      local.setItem(key, sessionValue);
    }
  });

  for (let i = 0; i < session.length; i += 1) {
    const key = session.key(i);
    if (!key || !key.startsWith(CHAT_HISTORY_PREFIX)) continue;
    const sessionValue = session.getItem(key);
    if (sessionValue !== null && local.getItem(key) === null) {
      local.setItem(key, sessionValue);
    }
  }

  local.setItem(CHAT_STORAGE_MIGRATION_KEY, '1');
};

export const getConversationStorage = () => {
  if (canUseLocalStorage()) {
    migrateConversationStorageToLocal();
    return window.localStorage;
  }
  if (canUseSessionStorage()) return window.sessionStorage;
  return null;
};

const safeParse = (rawValue, fallback) => {
  if (!rawValue) return fallback;
  try {
    return JSON.parse(rawValue);
  } catch (err) {
    return fallback;
  }
};

export const readRecentChats = () => {
  const storage = getConversationStorage();
  if (!storage) return [];
  const list = safeParse(storage.getItem(RECENT_CHAT_KEY), []);
  if (!Array.isArray(list)) return [];
  return list;
};

export const upsertRecentChat = ({ sessionId, firstQuestion }) => {
  const storage = getConversationStorage();
  if (!storage || !sessionId || !firstQuestion) return;

  const now = Date.now();
  const trimmedQuestion = String(firstQuestion).trim();
  if (!trimmedQuestion) return;

  const current = readRecentChats();
  const existing = current.find((item) => item?.sessionId === sessionId);

  const next = [
    {
      sessionId,
      firstQuestion: existing?.firstQuestion || trimmedQuestion,
      updatedAt: now,
    },
    ...current.filter((item) => item?.sessionId !== sessionId),
  ].slice(0, 20);

  storage.setItem(RECENT_CHAT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('pank-recent-chats-updated', { detail: { recentChats: next } }));
};

export const appendConversationMessages = (sessionId, messages) => {
  const storage = getConversationStorage();
  if (!storage || !sessionId || !Array.isArray(messages) || !messages.length) return;

  const key = `${CHAT_HISTORY_PREFIX}${sessionId}`;
  const current = safeParse(storage.getItem(key), []);
  const merged = Array.isArray(current) ? [...current, ...messages] : [...messages];
  storage.setItem(key, JSON.stringify(merged));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pank-chat-history-updated', {
      detail: {
        sessionId,
        historyLength: merged.length,
      },
    }));
  }
};

export const replaceConversationHistory = (sessionId, history) => {
  const storage = getConversationStorage();
  if (!storage || !sessionId || !Array.isArray(history)) return;
  const key = `${CHAT_HISTORY_PREFIX}${sessionId}`;
  storage.setItem(key, JSON.stringify(history));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pank-chat-history-updated', {
      detail: {
        sessionId,
        historyLength: history.length,
      },
    }));
  }
};

export const readConversationHistory = (sessionId) => {
  const storage = getConversationStorage();
  if (!storage || !sessionId) return [];
  const key = `${CHAT_HISTORY_PREFIX}${sessionId}`;
  const history = safeParse(storage.getItem(key), []);
  return Array.isArray(history) ? history : [];
};

export const exportConversationStorageSnapshot = () => {
  const storage = getConversationStorage();
  if (!storage) {
    return {
      exportedAt: new Date().toISOString(),
      recentChats: [],
      chatStartCache: null,
      pendingPlanCache: null,
      histories: {},
    };
  }

  const histories = {};
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(CHAT_HISTORY_PREFIX)) continue;

    const sessionId = key.slice(CHAT_HISTORY_PREFIX.length);
    const parsed = safeParse(storage.getItem(key), []);
    histories[sessionId] = Array.isArray(parsed) ? parsed : [];
  }

  return {
    exportedAt: new Date().toISOString(),
    recentChats: readRecentChats(),
    chatStartCache: safeParse(storage.getItem(CHAT_START_CACHE_KEY), null),
    pendingPlanCache: safeParse(storage.getItem(CHAT_PENDING_PLAN_CACHE_KEY), null),
    histories,
  };
};

export const clearConversationStorage = ({ keepRecent = 0 } = {}) => {
  const storage = getConversationStorage();
  if (!storage) {
    return { removedHistoryKeys: 0, keptRecent: 0 };
  }

  const desiredRecent = Math.max(0, Number(keepRecent) || 0);
  const currentRecent = readRecentChats();
  const keptRecentList = desiredRecent > 0 ? currentRecent.slice(0, desiredRecent) : [];

  if (keptRecentList.length) {
    storage.setItem(RECENT_CHAT_KEY, JSON.stringify(keptRecentList));
  } else {
    storage.removeItem(RECENT_CHAT_KEY);
  }

  const keysToDelete = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (key.startsWith(CHAT_HISTORY_PREFIX)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => storage.removeItem(key));
  storage.removeItem(CHAT_START_CACHE_KEY);
  storage.removeItem(CHAT_PENDING_PLAN_CACHE_KEY);

  return {
    removedHistoryKeys: keysToDelete.length,
    keptRecent: keptRecentList.length,
  };
};

export const clearConversationContentKeepIds = () => {
  const storage = getConversationStorage();
  if (!storage) {
    return { removedHistoryKeys: 0, keptRecent: 0 };
  }

  const currentRecent = readRecentChats();

  const keysToDelete = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (key.startsWith(CHAT_HISTORY_PREFIX)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => storage.removeItem(key));

  return {
    removedHistoryKeys: keysToDelete.length,
    keptRecent: currentRecent.length,
  };
};
