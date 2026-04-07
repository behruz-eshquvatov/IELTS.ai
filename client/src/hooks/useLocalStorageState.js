import { useEffect, useState } from "react";

export default function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }

    try {
      const savedValue = window.localStorage.getItem(key);
      return savedValue ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage write failures (private mode, disabled storage, etc.).
    }
  }, [key, value]);

  return [value, setValue];
}
