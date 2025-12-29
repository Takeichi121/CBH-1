import { useCallback } from "react";

export function useFormPersistence<T>(storageKey: string) {
  const saveData = useCallback((data: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save form data:", error);
    }
  }, [storageKey]);

  const restoreData = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.error("Failed to restore form data:", error);
    }
    return null;
  }, [storageKey]);

  const clearData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Failed to clear form data:", error);
    }
  }, [storageKey]);

  const hasDraft = useCallback(() => {
    return localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  return {
    saveData,
    restoreData,
    clearData,
    hasDraft: hasDraft(),
  };
}
