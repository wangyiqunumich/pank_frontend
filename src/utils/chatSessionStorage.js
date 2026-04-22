const RECENT_CHAT_KEY = 'pank_recent_conversations_v1';
const CHAT_HISTORY_PREFIX = 'pank_chat_history_v1:';

const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const safeParse = (rawValue, fallback) => {
  if (!rawValue) return fallback;
  try {
    return JSON.parse(rawValue);
  } catch (err) {
    return fallback;
  }
};

export const readRecentChats = () => {
  if (!canUseSessionStorage()) return [];
  const list = safeParse(window.sessionStorage.getItem(RECENT_CHAT_KEY), []);
  if (!Array.isArray(list)) return [];
  return list;
};

export const upsertRecentChat = ({ sessionId, firstQuestion }) => {
  if (!canUseSessionStorage() || !sessionId || !firstQuestion) return;

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

  window.sessionStorage.setItem(RECENT_CHAT_KEY, JSON.stringify(next));
};

export const appendConversationMessages = (sessionId, messages) => {
  if (!canUseSessionStorage() || !sessionId || !Array.isArray(messages) || !messages.length) return;

  const key = `${CHAT_HISTORY_PREFIX}${sessionId}`;
  const current = safeParse(window.sessionStorage.getItem(key), []);
  const merged = Array.isArray(current) ? [...current, ...messages] : [...messages];
  window.sessionStorage.setItem(key, JSON.stringify(merged));
};

export const replaceConversationHistory = (sessionId, history) => {
  if (!canUseSessionStorage() || !sessionId || !Array.isArray(history)) return;
  const key = `${CHAT_HISTORY_PREFIX}${sessionId}`;
  window.sessionStorage.setItem(key, JSON.stringify(history));
};

export const readConversationHistory = (sessionId) => {
  if (!canUseSessionStorage() || !sessionId) return [];
  const key = `${CHAT_HISTORY_PREFIX}${sessionId}`;
  const history = safeParse(window.sessionStorage.getItem(key), []);
  return Array.isArray(history) ? history : [];
};
