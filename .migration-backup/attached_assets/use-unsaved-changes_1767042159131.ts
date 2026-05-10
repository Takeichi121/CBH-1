import { useState, useEffect, useCallback } from 'react';

export function useUnsavedChanges() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mark as having unsaved changes
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  // Handle beforeunload event to warn users
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'คุณมีการเปลี่ยนแปลงข้อมูลที่ยังไม่ได้บันทึก หากออกจากหน้านี้ข้อมูลจะสูญหาย';
        return 'คุณมีการเปลี่ยนแปลงข้อมูลที่ยังไม่ได้บันทึก หากออกจากหน้านี้ข้อมูลจะสูญหาย';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    markAsSaved
  };
}
