// import { OpenRouter } from "@openrouter/sdk";

console.log("Talking AI content script injected");

let speakButton = null;
let lastSelectionText = "";
let SETTINGS = {
    apiKey: "",
    model: "gpt-3.5-turbo",
    voice: "",
    readAloud: false,
    autoExplain: false,
    rate: 1,
    pitch: 1,
    customPrompt: "",
};


/* ------------------ Speech ------------------ */
function speak(text) {

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = SETTINGS.rate || 1;
    utterance.pitch = SETTINGS.pitch || 1;

    if (SETTINGS.voice) {
        const voice = speechSynthesis
            .getVoices()
            .find(v => v.voiceURI === SETTINGS.voice);
        if (voice) utterance.voice = voice;
    }

    console.log("Speaking with settings:", {
        voice: utterance.voice ? utterance.voice.name : "default",
        rate: utterance.rate,
        pitch: utterance.pitch,
    });

    speechSynthesis.cancel();
    setTimeout(() => speechSynthesis.speak(utterance), 50);
}

/* ------------------ Floating Button ------------------ */
function removeButton() {
    if (speakButton) {
        speakButton.remove();
        speakButton = null;
    }
}

function createButton(x, y, text) {
    console.log("Creating speak button:", text);

    removeButton();

    speakButton = document.createElement("div");
    speakButton.id = "talking-ai-btn";
    speakButton.innerHTML = "🔊";

    Object.assign(speakButton.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 999999,
        cursor: "pointer",
        padding: "10px",
        backgroundColor: "#007bff",
        color: "#fff",
        borderRadius: "6px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        userSelect: "none",
    });

    // 🔑 CRITICAL: Stop event from bubbling
    speakButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
    });

    speakButton.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log("Speak button clicked");
        speak(text);
    });

    document.body.appendChild(speakButton);
}

/* ------------------ Selection Listener ------------------ */
document.addEventListener("mouseup", (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text || text === lastSelectionText) return;
    if (selection.rangeCount === 0) return;

    lastSelectionText = text;

    const rect = selection.getRangeAt(0).getBoundingClientRect();

    createButton(
        rect.right + window.scrollX + 6,
        rect.top + window.scrollY - 10,
        text
    );
});

/* ------------------ Click Outside Cleanup ------------------ */
document.addEventListener("mousedown", (e) => {
    if (speakButton && !speakButton.contains(e.target)) {
        removeButton();
    }
});



/* ------------------ Helper Functions ------------------ */
function getReadableText() {
    return document.body.innerText.trim();
}

chrome.storage.sync.get(SETTINGS, (items) => {
    SETTINGS = { ...SETTINGS, ...items };
});

async function explainText(text) {
    const prompt = SETTINGS.customPrompt || `Explain the following text in simple terms: ${text}`;

    try {
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
            throw new Error("Network response was not ok");
        }


        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error explaining text:", error);
        return "Sorry, I couldn't explain the text.";
    }
}

/* ------------------ Chrome Messages ------------------ */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.action === "readAloud") {
        speak(getReadableText());
        sendResponse({ status: "reading" });
    }

    if (message.action === "stopReading") {
        speechSynthesis.cancel();
        sendResponse({ status: "stopped" });
    }

    if (message.action === "explainText") {
        (async () => {
            const selection = window.getSelection().toString().trim();
            if (!selection) {
                alert("Please select some text first");
                return;
            }
            const explanation = await explainText(selection);
            speak(explanation);
            sendResponse({ status: "explained" });
        })();
        return true; // required for async
    }

    if (message.action === "updateSettings") {
        SETTINGS = { ...SETTINGS, ...message.settings };
        console.log("Updated settings:", SETTINGS);
        sendResponse({ status: "settings updated" });
    }
});
