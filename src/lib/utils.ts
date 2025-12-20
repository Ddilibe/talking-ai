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


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSettings(): Promise<typeof DEFAULT_SETTINGS> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.local.get(
      ["apiKey", "model", "voice", "readAloud", "autoExplain", "rate", "pitch"],
      // @ts-ignore
      (items) => {
        resolve({ ...DEFAULT_SETTINGS, ...items });
      }
    )
  }
  )
};

export function saveSettings(settings: Partial<typeof DEFAULT_SETTINGS>) {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.local.set({ settings }, resolve);
  });
}