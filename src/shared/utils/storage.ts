function setItem(key: string, value: unknown): void {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error("Failed to save to localStorage", error);
  }
}

function getItem<T>(key: string): T | null {
  try {
    const serializedValue = localStorage.getItem(key);
    return serializedValue ? (JSON.parse(serializedValue) as T) : null;
  } catch (error) {
    console.error("Failed to retrieve from localStorage", error);
    return null;
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to remove from localStorage", error);
  }
}

export default { setItem, getItem, removeItem };
