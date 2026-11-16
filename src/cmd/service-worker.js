const DEFAULT_SETTINGS = {
    apiKey: "",
    model: "gpt-3.5-turbo",
    voice: "",
    readAloud: false,
    autoExplain: false,
    rate: 1,
    pitch: 1,
    customPrompt: "",
};

let settings = { ...DEFAULT_SETTINGS };

async function loadSettings() {
    const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
    settings = { ...DEFAULT_SETTINGS, ...stored };
    return settings;
}

async function broadcastSettings() {
    const tabs = await chrome.tabs.query({});
    const message = { action: "updateSettings", settings };
    const results = await Promise.allSettled(
        tabs
            .filter((tab) => typeof tab.id === "number")
            .map((tab) => chrome.tabs.sendMessage(tab.id, message))
    );
    const delivered = results.filter((result) => result.status === "fulfilled").length;
    console.log(`[Service Worker] Broadcast settings to ${delivered}/${results.length} tabs`);
}

async function speakWithChromeTts(text) {
    if (!text?.trim()) {
        return { status: "error", error: "No text provided" };
    }

    const currentSettings = await loadSettings();

    await chrome.tts.stop();

    return new Promise((resolve, reject) => {
        chrome.tts.speak(text, {
            rate: currentSettings.rate || 1,
            pitch: currentSettings.pitch || 1,
            voiceName: currentSettings.voice || undefined,
            onEvent: (event) => {
                if (event.type === "end") {
                    resolve({ status: "spoken" });
                } else if (event.type === "interrupted" || event.type === "cancelled") {
                    resolve({ status: "stopped" });
                } else if (event.type === "error") {
                    reject(new Error(event.errorMessage || "Speech playback failed"));
                }
            },
        });
    });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
        return;
    }

    const updatedKeys = [];
    for (const [key, value] of Object.entries(changes)) {
        if (key in settings) {
            settings[key] = value.newValue;
            updatedKeys.push(key);
        }
    }

    if (updatedKeys.length === 0) {
        return;
    }

    console.log("[Service Worker] Settings changed:", updatedKeys.join(", "));
    broadcastSettings().catch((error) => {
        console.error("[Service Worker] Failed to broadcast settings:", error);
    });
});

loadSettings().catch(console.error);

chrome.commands.onCommand.addListener((command) => {
    if (command !== "get-pdf-selection") {
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTabId = tabs[0]?.id;
        if (activeTabId) {
            chrome.tabs.sendMessage(activeTabId, { action: "trigger-capture" });
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    const nextUrl = changeInfo.url?.toLowerCase();
    if (
        !nextUrl ||
        !nextUrl.endsWith(".pdf") ||
        !nextUrl.startsWith("file:") ||
        nextUrl.includes(chrome.runtime.id)
    ) {
        return;
    }

    const viewerUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
    const redirectUrl = `${viewerUrl}?file=${encodeURIComponent(changeInfo.url)}`;
    chrome.tabs.update(tabId, { url: redirectUrl });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "speakText") {
        speakWithChromeTts(message.text)
            .then(sendResponse)
            .catch((error) => {
                console.error("[Service Worker] speakText failed:", error);
                sendResponse({ status: "error", error: error.message });
            });
        return true;
    }

    if (message.action === "stopSpeaking") {
        chrome.tts.stop()
            .then(() => sendResponse({ status: "stopped" }))
            .catch((error) => {
                console.error("[Service Worker] stopSpeaking failed:", error);
                sendResponse({ status: "error", error: error.message });
            });
        return true;
    }

    if (message.action === "getSpeechSettings") {
        loadSettings()
            .then((loadedSettings) => sendResponse({ status: "ok", settings: loadedSettings }))
            .catch((error) => {
                console.error("[Service Worker] getSpeechSettings failed:", error);
                sendResponse({ status: "error", error: error.message });
            });
        return true;
    }
});
