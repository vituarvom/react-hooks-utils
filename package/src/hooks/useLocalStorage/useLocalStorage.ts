import { useState, useEffect, useCallback } from "react";

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // The debounced function
  const debouncedFunction = (...args: Parameters<T>) => {
    // Clear the previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set a new timeout
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };

  // Attach a cancel method to the debounced function
  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFunction;
}

export function useLocalStorage<T>(key: keyof T, initialValue?: T[keyof T]) {
  const [storedValue, setStoredValue] = useState<T[keyof T] | undefined>(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return initialValue;
      }
      const item = localStorage.getItem(key as string);
      return item ? (JSON.parse(item) as T[keyof T]) : initialValue;
    } catch (error) {
      console.error(
        `Error reading localStorage key "${key as string}":`,
        error
      );
      return initialValue; // Default to initialValue on error
    }
  });
  // Debounced localStorage update
  const debouncedSetItem = useCallback(
    debounce((value: T[keyof T] | unknown) => {
      try {
        if (value === null || value === undefined) {
          localStorage.removeItem(key as string);
        } else {
          localStorage.setItem(key as string, JSON.stringify(value));
        }
      } catch (error) {
        console.error(
         ` Error setting localStorage key "${key as string}":`,
          error
        );
      }
    }, 300),
    [key]
  );

  // Handle updates from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue !== null) {
          try {
            setStoredValue(JSON.parse(e.newValue) as T[keyof T]);
          } catch (error) {
            console.error(
              `Error parsing storage event for "${key as string}":`,
              error
            );
          }
        } else {
          setStoredValue(undefined);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      debouncedSetItem.cancel();
    };
  }, [key, initialValue]);

  const setValue = (
    value: T[keyof T] | ((val: T[keyof T] | undefined) => T[keyof T])
  ) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
      debouncedSetItem(valueToStore);
    } catch (error) {
      console.error(
        `Error setting localStorage key "${key as string}":`,
        error
      );
    }
  };

  const removeKey = (key: keyof T) => {
    try {
      localStorage.removeItem(key as string);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(
        `Error clearing localStorage key "${key as string}":`,
        error
      );
    }
  };


  return [storedValue, setValue, removeKey, clearAll] as const;
}