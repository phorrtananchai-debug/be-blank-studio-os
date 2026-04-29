export const storageKeys = {
  content: 'beBlank.content',
  portfolio: 'beBlank.portfolio',
};

export function readCollection(key, fallback) {
  const rawValue = window.localStorage.getItem(key);
  return rawValue ? JSON.parse(rawValue) : fallback;
}

export function writeCollection(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
