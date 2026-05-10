const noop = () => {};

function createSafeStorage() {
  let available = true;
  try {
    const test = "__bk_storage_test__";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
  } catch {
    available = false;
  }

  return {
    getItem(key: string): string | null {
      if (!available) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      if (!available) return;
      try {
        localStorage.setItem(key, value);
      } catch {
        noop();
      }
    },
    removeItem(key: string): void {
      if (!available) return;
      try {
        localStorage.removeItem(key);
      } catch {
        noop();
      }
    },
  };
}

export const safeStorage = createSafeStorage();
