import { useEffect } from 'react';

export function useEscapeKey(isActive, onEscape) {
  useEffect(() => {
    if (!isActive) return undefined;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);
}
