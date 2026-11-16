import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "gpt-3.5-turbo",
  voice: "",
  readAloud: false,
  autoExplain: false,
  rate: 1,
  pitch: 1,
  customPrompt: "",
}

type ExtensionSettings = typeof DEFAULT_SETTINGS
type StorageArea = {
  get: (
    keys: string[],
    callback: (items: Partial<ExtensionSettings>) => void
  ) => void
  set: (
    items: Partial<ExtensionSettings>,
    callback?: () => void
  ) => void
}
type ChromeStorageApi = {
  storage?: {
    sync?: StorageArea
    local?: StorageArea
  }
  runtime?: {
    lastError?: { message?: string }
  }
}

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS)
const chromeApi = (globalThis as typeof globalThis & { chrome?: ChromeStorageApi }).chrome

function getStorageArea(): StorageArea | undefined {
  return chromeApi?.storage?.sync ?? chromeApi?.storage?.local
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    const storage = getStorageArea()
    if (!storage) {
      resolve({ ...DEFAULT_SETTINGS })
      return
    }

    storage.get(SETTINGS_KEYS, (items) => {
      const error = chromeApi?.runtime?.lastError
      if (error) {
        console.error("[Settings] Failed to read settings:", error.message)
      }
      resolve({ ...DEFAULT_SETTINGS, ...items });
    })
  }
  )
};

export function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const storage = getStorageArea()
    if (!storage) {
      const error = "chrome.storage is unavailable"
      console.error("[Settings] Failed to save settings:", error)
      resolve({ ok: false, error })
      return
    }

    storage.set(settings, () => {
      const error = chromeApi?.runtime?.lastError
      if (error) {
        console.error("[Settings] Failed to save settings:", error.message)
        resolve({ ok: false, error: error.message ?? "Unknown storage error" })
        return
      }
      resolve({ ok: true })
    });
  });
}
