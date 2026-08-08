import { useState, useEffect } from 'react';

export function useKeyboardListNav(items, onSelect, onClose) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    setHighlightedIndex(items.length ? 0 : -1);
  }, [items]);

  const onKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        e.preventDefault();
        onSelect(items[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setHighlightedIndex(-1);
      if (onClose) onClose();
    }
  };

  return { highlightedIndex, setHighlightedIndex, onKeyDown };
}
