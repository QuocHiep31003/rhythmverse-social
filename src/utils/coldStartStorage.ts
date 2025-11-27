type ColdStartStatus = "pending" | "completed" | "unknown";

const STORAGE_KEY = "rv:cold-start-status";

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const safeStorage = getStorage();

const readStatus = (): ColdStartStatus => {
  const value = safeStorage?.getItem(STORAGE_KEY);
  if (value === "completed") {
    return "completed";
  }
  if (value === "pending") {
    return "pending";
  }
  return "unknown";
};

const writeStatus = (status: ColdStartStatus) => {
  if (!safeStorage) {
    return;
  }
  if (status === "unknown") {
    safeStorage.removeItem(STORAGE_KEY);
    return;
  }
  safeStorage.setItem(STORAGE_KEY, status);
};

export const coldStartStorage = {
  getStatus(): ColdStartStatus {
    return readStatus();
  },
  isCompleted(): boolean {
    return readStatus() === "completed";
  },
  markCompleted(): void {
    writeStatus("completed");
  },
  markIncomplete(): void {
    writeStatus("unknown");
  },
};

export default coldStartStorage;

