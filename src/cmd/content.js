// import { OpenRouter } from "@openrouter/sdk";

// importScripts("./kokoro.web.js");

// const { KokoroTTS, TextSplitterStream } = require("./kokoro.web.js");
console.log("Talking AI content script injected");

let speakButton = null;
let lastSelectionText = "";


class SettingConfig {
    constructor() {
        this.apiKey = "";
        this.voice = "";
        this.readAloud = false;
        this.autoExplain = false;
        this.rate = 1;
        this.pitch = 1;
        this.customPrompt = "";
        this.model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
        this.model = null;


    }
    async update_from_storage() {
        // const tts = await KokoroTTS.from_pretrained(model_id, {
        //     dtype: "fp32", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
        //     // device: "webgpu", // Options: "wasm", "webgpu" (web) or "cpu" (node).
        // });

        // this.model = "gpt-3.5-turbo";
        // name
    }

    data() {
        let new_data = {
            apiKey: this.apiKey,
            model: this.model,
            voice: this.voice,
            readAloud: this.readAloud,
            autoExplain: this.autoExplain,
            rate: this.rate,
            pitch: this.pitch,
            customPrompt: this.customPrompt,
        };
        return new_data;
    }

    async speak(text) {
        const splitter = new TextSplitterStream();
        const stream = tts.stream(splitter);
        (async () => {
            let i = 0;
            for await (const { text, phonemes, audio } of stream) {
                console.log({ text, phonemes });
                audio.save(`audio-${i++}.wav`);
            }
        })();

        const tokens = text.match(/\s*\S+/g);
        for (const token of tokens) {
            splitter.push(token);
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        splitter.close();
    }

}

let SETTINGS = new SettingConfig();
SETTINGS.update_from_storage();

/* ------------------ Speech ------------------ */
async function speak(text) {

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

    const response = await chrome.runtime.sendMessage({
        action: "doSomething",
        data: text
    });
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
        position: 'fixed',
        top: `${y - 45}px`, // 45px above the highlight
        left: `${x}px`,
        zIndex: '2147483647', // Maximum possible z-index
        padding: '6px 12px',
        backgroundColor: '#202124',
        color: 'white',
        border: 'none',
        borderRadius: '16px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'sans-serif',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
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

// chrome.commands.onCommand.addListener((command) => {
//     if (command === "get-pdf-selection") {
//         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//             chrome.tabs.sendMessage(tabs[0].id, { action: "trigger-capture" });
//         });
//     }
// });

/* ------------------ Selection Listener ------------------ */
document.addEventListener("mouseup", (e) => {

    const pdfEmbeded = document.querySelector('embed[type="application/pdf"]');
    const selection = window.getSelection();
    const text = selection.toString().trim();


    console.log("Checking embeded PDF: ", pdfEmbeded);
    console.log("Checking Selection: ", selection, text);
    // const selection = window.getSelection();
    // const text = selection.toString().trim();

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

    if (message.action === "trigger-capture") {
        const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
        if (!pdfEmbed) {
            console.log("No native PDF viewer found.")
            return;
        }

        window.addEventListener('message', function onMessage(e) {
            if (e.data && e.data.type === 'getSelectedTextReply') {
                window.removeEventListener('message', onMessage);
                const text = e.data.selectedText;
                if (text) {
                    speak(text);
                    SETTINGS.speak(text);
                } else {
                    alert("No text selected.");
                }
            }
        }, { once: true });

        pdfEmbed.postMessage({ type: 'getSelectedText' }, '*');
    }
});
