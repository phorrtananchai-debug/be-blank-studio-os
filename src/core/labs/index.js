const safeString = (value, fallback = '') => {
  const normalized = typeof value === 'string' ? value.trim() : String(value || '').trim();
  return normalized || fallback;
};

export const normalizeWatchlistItem = (item = {}, index = 0) => ({
  id: safeString(item.id, `watch-${index + 1}`),
  ticker: safeString(item.ticker || item.symbol).toUpperCase(),
  displayName: safeString(item.displayName || item.companyName || item.name || item.ticker),
  thesis: safeString(item.thesis),
  note: safeString(item.note || item.aiNotes),
  conviction: safeString(item.conviction, 'Medium'),
  status: safeString(item.status || item.radarStatus, 'Watching'),
});

export const normalizeJournalEntry = (entry = {}, index = 0) => ({
  id: safeString(entry.id, `journal-${index + 1}`),
  date: safeString(entry.date || entry.timestamp || new Date().toISOString()),
  title: safeString(entry.title || entry.ticker || 'Journal entry'),
  content: safeString(entry.content || entry.reason || entry.note),
  mood: safeString(entry.mood || entry.emotion, 'Neutral'),
  tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [],
});

export const normalizeLabsState = (labs = {}) => ({
  sandboxHoldings: Array.isArray(labs.sandboxHoldings) ? labs.sandboxHoldings : [],
  watchlist: Array.isArray(labs.watchlist) ? labs.watchlist.map(normalizeWatchlistItem) : [],
  experimentalIdeas: Array.isArray(labs.experimentalIdeas) ? labs.experimentalIdeas : [],
  tacticalSimulations: Array.isArray(labs.tacticalSimulations) ? labs.tacticalSimulations : [],
  notes: safeString(labs.notes),
});
