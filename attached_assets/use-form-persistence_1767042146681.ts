import { useState, useCallback, useRef } from 'react';

interface FormPersistenceOptions {
  debounceMs?: number;
}

export function useFormPersistence<T>(
  key: string, 
  options: FormPersistenceOptions = {}
) {
  const { debounceMs = 1000 } = options;
  const [hasDraft, setHasDraft] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Save data to localStorage with debouncing
  const saveData = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem(`form_draft_${key}`, serialized);
        setHasDraft(true);
        setLastAutoSave(new Date());
      } catch (error) {
        console.error('Failed to save form data:', error);
      }
    }, debounceMs);
  }, [key, debounceMs]);

  // Restore data from localStorage
  const restoreData = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`form_draft_${key}`);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        setHasDraft(true);
        setLastAutoSave(new Date(timestamp));
        return data;
      }
    } catch (error) {
      console.error('Failed to restore form data:', error);
    }
    return null;
  }, [key]);

  // Clear saved data
  const clearData = useCallback(() => {
    try {
      localStorage.removeItem(`form_draft_${key}`);
      setHasDraft(false);
      setLastAutoSave(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to clear form data:', error);
    }
  }, [key]);

  // Check if draft exists
  const checkHasDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(`form_draft_${key}`);
      const exists = !!saved;
      setHasDraft(exists);
      return exists;
    } catch (error) {
      console.error('Failed to check draft:', error);
      return false;
    }
  }, [key]);

  return {
    saveData,
    restoreData,
    clearData,
    hasDraft,
    lastAutoSave,
    checkHasDraft
  };
}
