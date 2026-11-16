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
let warningElement = null;

function isExtensionContextValid() {
    try {
        return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
    } catch (error) {
        console.warn("[Content] Extension context check failed:", error);
        return false;
    }
}

function showWarning(message) {
    if (!document.body) {
        console.warn("[Content] Cannot display warning yet:", message);
        return;
    }

    if (warningElement) {
        warningElement.remove();
    }

    const warning = document.createElement("div");
    warning.id = "talking-ai-warning";
    warning.setAttribute("role", "alert");
    warning.textContent = message;

    Object.assign(warning.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: "2147483647",
        maxWidth: "320px",
        padding: "10px 14px",
        backgroundColor: "#202124",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        fontSize: "13px",
        fontFamily: "sans-serif",
        lineHeight: "1.4",
    });

    document.body.appendChild(warning);
    warningElement = warning;

    window.setTimeout(() => {
        if (warningElement === warning) {
            warning.remove();
            warningElement = null;
        }
    }, 6000);
}

function speakWithWebSpeech(text) {
    return new Promise((resolve, reject) => {
        if (
            typeof window.speechSynthesis === "undefined" ||
            typeof SpeechSynthesisUtterance === "undefined"
        ) {
            reject(new Error("Speech synthesis is not supported on this page."));
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = SETTINGS.rate || 1;
        utterance.pitch = SETTINGS.pitch || 1;

        if (SETTINGS.voice) {
            const voice = window.speechSynthesis
                .getVoices()
                .find(
                    (candidate) =>
                        candidate.voiceURI === SETTINGS.voice ||
                        candidate.name === SETTINGS.voice
                );
            if (voice) {
                utterance.voice = voice;
            }
        }

        utterance.onend = () => resolve({ status: "spoken-fallback" });
        utterance.onerror = (event) => {
            if (event.error === "interrupted" || event.error === "canceled") {
                resolve({ status: "stopped" });
                return;
            }
            reject(new Error(event.error || "Web Speech playback failed"));
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}

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
            throw new Error("No text selected to read aloud.");
        }

        let lastError = null;

        if (isExtensionContextValid()) {
            for (let attempt = 1; attempt <= 2; attempt += 1) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "speakText",
                        text: cleanText,
                    });

                    if (response?.status === "error") {
                        throw new Error(response.error || "Speech playback failed");
                    }

                    return response;
                } catch (error) {
                    lastError = error;
                    console.warn(
                        `[Content] Speech attempt ${attempt} failed:`,
                        error
                    );

                    if (attempt < 2) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 250 * attempt)
                        );
                    }
                }
            }
        } else {
            lastError = new Error(
                "Talking AI is unavailable on this page. Try reloading the page."
            );
            console.warn(
                "[Content] Extension context unavailable, using Web Speech fallback."
            );
        }

        try {
            const fallbackResponse = await speakWithWebSpeech(cleanText);
            console.log("[Content] Used Web Speech fallback successfully.");
            return fallbackResponse;
        } catch (fallbackError) {
            console.error("[Content] Web Speech fallback failed:", fallbackError);
            throw lastError || fallbackError;
        }
    }

    async stop() {
        try {
            if (isExtensionContextValid()) {
                await chrome.runtime.sendMessage({ action: "stopSpeaking" });
            }
        } catch (error) {
            console.warn("[Content] Failed to stop extension speech:", error);
        }

        if (typeof window.speechSynthesis !== "undefined") {
            window.speechSynthesis.cancel();
        }
    }
}

const SETTINGS = new SettingConfig();
SETTINGS.loadFromStorage().catch(console.error);


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
            showWarning(
                error?.message ||
                "Talking AI could not play speech on this page. Try selecting the text again or reloading."
            );
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
                    showWarning(
                        error?.message ||
                        "Talking AI could not read this page aloud."
                    );
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
                showWarning("Please select some text first.");
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
                    showWarning(
                        error?.message ||
                        "Talking AI could not explain the selected text."
                    );
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
                showWarning(
                    "Talking AI could not find a PDF on this page. Open the PDF in Chrome's viewer and try again."
                );
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
                    showWarning("No text selected in the PDF.");
                    return;
                }

                SETTINGS.speak(text).catch((error) => {
                    console.error("[Content] PDF speech failed:", error);
                    showWarning(
                        error?.message ||
                        "Talking AI could not play speech in this PDF."
                    );
                });
            }, { once: true });

            pdfEmbed.postMessage({ type: "getSelectedText" }, "*");
            sendResponse({ status: "capture triggered" });
            return false;
        }
        default:
            console.warn("[Content] Unknown action:", message.action);
            sendResponse({ status: "unknown action" });
            return false;
    }
});
