import { createSafeStorage } from './safeStorage';

test('denied storage getters preserve writes, keys and removal in memory', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Denied', 'SecurityError'); } });
  try {
    const storage = createSafeStorage(['localStorage']);
    storage.setItem('run', 'saved'); expect(storage.getItem('run')).toBe('saved');
    expect(storage.length).toBe(1); expect(storage.key(0)).toBe('run');
    storage.removeItem('run'); expect(storage.getItem('run')).toBeNull(); expect(storage.length).toBe(0);
  } finally { Object.defineProperty(window, 'localStorage', descriptor); }
});

test('quota errors fall back to session storage without hiding the new value', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: () => 'old', setItem() { throw new DOMException('Full', 'QuotaExceededError'); }, removeItem() {} } });
  try {
    const storage = createSafeStorage(['localStorage', 'sessionStorage']);
    storage.setItem('quota-test', 'new'); expect(storage.getItem('quota-test')).toBe('new');
    expect(sessionStorage.getItem('quota-test')).toBe('new');
  } finally { Object.defineProperty(window, 'localStorage', descriptor); sessionStorage.removeItem('quota-test'); }
});

test('conversation persistence remains optional when both stores are blocked', () => {
  const descriptors = ['localStorage', 'sessionStorage'].map(name => [name, Object.getOwnPropertyDescriptor(window, name)]);
  descriptors.forEach(([name]) => Object.defineProperty(window, name, { configurable: true, get() { throw new Error('blocked'); } }));
  try {
    jest.isolateModules(() => {
      const { upsertRecentChat, readRecentChats } = require('./chatSessionStorage');
      expect(() => upsertRecentChat({ sessionId: 'safe-storage-run', firstQuestion: 'Saved question' })).not.toThrow();
      expect(readRecentChats()[0].sessionId).toBe('safe-storage-run');
    });
  } finally { descriptors.forEach(([name, descriptor]) => Object.defineProperty(window, name, descriptor)); }
});
