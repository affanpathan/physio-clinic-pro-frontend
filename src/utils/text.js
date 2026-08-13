export const truncateNote = (text, len = 10) => {
  if (!text) return '—';
  return text.length > len ? `${text.slice(0, len)}…` : text;
};
