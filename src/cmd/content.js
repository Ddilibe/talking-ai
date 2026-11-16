console.log("Talking AI content script injected");

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

let speakButton = null;
let lastSelectionText = "";

class SettingConfig {
    constructor() {
        Object.assign(this, DEFAULT_SETTINGS);
    }

    async loadFromStorage() {
        const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
        Object.assign(this, DEFAULT_SETTINGS, stored);
        console.log(
            "[Content] Loaded settings from storage:",
            Object.keys(stored).join(", ") || "defaults"
        );
    }

    async speak(text) {
        const cleanText = text?.trim();
        if (!cleanText) {
            return;
        }

        const response = await chrome.runtime.sendMessage({
            action: "speakText",
            text: cleanText,
        });

        if (response?.status === "error") {
            throw new Error(response.error || "Speech playback failed");
        }
    }

    async stop() {
        await chrome.runtime.sendMessage({ action: "stopSpeaking" });
    }
}

const SETTINGS = new SettingConfig();
SETTINGS.loadFromStorage().catch(console.error);


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
        if (key in DEFAULT_SETTINGS) {
            SETTINGS[key] = value.newValue;
            updatedKeys.push(key);
        }
    }

    if (updatedKeys.length > 0) {
        console.log(
            "[Content] Settings updated via storage change:",
            updatedKeys.join(", ")
        );
    }
});

function removeButton() {
    if (speakButton) {
        speakButton.remove();
        speakButton = null;
    }
}

function createButton(x, y, text) {
    removeButton();

    speakButton = document.createElement("div");
    speakButton.id = "talking-ai-btn";
    speakButton.innerHTML = "🔊";

    Object.assign(speakButton.style, {
        position: "fixed",
        top: `${y - 45}px`,
        left: `${x}px`,
        zIndex: "2147483647",
        padding: "6px 12px",
        backgroundColor: "#202124",
        color: "white",
        border: "none",
        borderRadius: "16px",
        cursor: "pointer",
        fontSize: "13px",
        fontFamily: "sans-serif",
        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    });

    speakButton.addEventListener("mousedown", (event) => event.stopPropagation());
    speakButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        try {
            await SETTINGS.speak(text);
        } catch (error) {
            console.error("[Content] Speak button failed:", error);
            alert("Talking AI could not play speech." + error);
        }
    });

    document.body.appendChild(speakButton);
}

document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text === lastSelectionText || selection.rangeCount === 0) {
        return;
    }

    lastSelectionText = text;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    createButton(rect.right + window.scrollX + 6, rect.top + window.scrollY - 10, text);
});

document.addEventListener("mousedown", (event) => {
    if (speakButton && !speakButton.contains(event.target)) {
        removeButton();
    }
});

async function explainText(text) {
    const prompt = SETTINGS.customPrompt
        || `Explain the following text in simple terms: ${text}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SETTINGS.apiKey}`,
        },
        body: JSON.stringify({
            model: SETTINGS.model,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "";
}

function getReadableText() {
    return document.body?.innerText?.trim() || "";
}

chrome.runtime.onMessage.addListener(async (message, _sender, sendResponse) => {
    console.log("[Content] Received message:", message.action);

    switch (message.action) {
        case "readAloud":
            SETTINGS.speak(getReadableText())
                .then(() => sendResponse({ status: "reading" }))
                .catch((error) => {
                    console.error("[Content] readAloud failed:", error);
                    sendResponse({ status: "error", error: error.message });
                });
            return true;

        case "stopReading":
            SETTINGS.stop()
                .then(() => sendResponse({ status: "stopped" }))
                .catch((error) => {
                    console.error("[Content] stopReading failed:", error);
                    sendResponse({ status: "error", error: error.message });
                });
            return true;

        case "explainText": {
            const selection = window.getSelection()?.toString().trim();
            if (!selection) {
                alert("Please select some text first.");
                sendResponse({ status: "no selection" });
                return false;
            }

            (async () => {
                try {
                    const explanation = await explainText(selection);
                    await SETTINGS.speak(explanation);
                    sendResponse({ status: "explained" });
                } catch (error) {
                    console.error("[Content] explainText failed:", error);
                    sendResponse({ status: "error", error: error.message });
                }
            })();
            return true;
        }

        case "updateSettings": {
            const incomingSettings = message.settings || {};
            const updatedKeys = Object.keys(incomingSettings).filter(
                (key) => key in DEFAULT_SETTINGS
            );

            if (updatedKeys.length > 0) {
                Object.assign(SETTINGS, incomingSettings);
                console.log(
                    "[Content] Applied settings update from background:",
                    updatedKeys.join(", ")
                );
            } else {
                SETTINGS.loadFromStorage().catch((error) => {
                    console.error("[Content] Failed to reload settings:", error);
                });
                console.log(
                    "[Content] No settings in update message, reloading from storage."
                );
            }

            sendResponse({ status: "settings updated" });
            return false;
        }

        case "trigger-capture": {
            const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
            if (!pdfEmbed) {
                console.warn("[Content] No native PDF viewer found.");
                sendResponse({ status: "no pdf" });
                return false;
            }

            window.addEventListener("message", function onMessage(event) {
                if (event.data?.type !== "getSelectedTextReply") {
                    return;
                }

                window.removeEventListener("message", onMessage);

                const text = event.data.selectedText;
                if (!text) {
                    alert("No text selected in PDF.");
                    return;
                }

                SETTINGS.speak(text).catch((error) => {
                    console.error("[Content] PDF speech failed:", error);
                    alert("Talking AI could not play speech.");
                });
            }, { once: true });

            pdfEmbed.postMessage({ type: "getSelectedText" }, "*");
            sendResponse({ status: "capture triggered" });
            return false;
        }
        case "speakText": {
            await speakWithChromeTts(message.text)
                .then(sendResponse)
                .catch((error) => {
                    console.error("[Service Worker] speakText failed:", error);
                    sendResponse({ status: "error", error: error.message });
                });
            return true;
        }


        default:
            console.warn("[Content] Unknown action:", message.action);
            sendResponse({ status: "unknown action" });
            return false;
    }
});
