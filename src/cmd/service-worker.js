// import { KokoroTTS, TextSplitterStream } from "./kokoro.web.js";


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
        // const tts = await KokoroTTS.from_pretrained(this.model_id, {
        //     dtype: "fp32", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
        //     // device: "webgpu", // Options: "wasm", "webgpu" (web) or "cpu" (node).
        // });
        // this.tts = tts;
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
        const stream = this.tts.stream(splitter);
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
SETTINGS.update_from_storage().then(() => {
    console.log("Kokoro model loaded");
}).catch(console.error);

chrome.commands.onCommand.addListener((command) => {
    if (command === "get-pdf-selection") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "trigger-capture" });
        });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the URL is a PDF and NOT already being handled by our extension
    if (changeInfo.url &&
        changeInfo.url.toLowerCase().endsWith(".pdf") &&
        changeInfo.url.toLowerCase().startsWith("file:") &&
        !changeInfo.url.includes(chrome.runtime.id)) {

        const viewerUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
        const redirectUrl = `${viewerUrl}?file=${encodeURIComponent(changeInfo.url)}`;

        chrome.tabs.update(tabId, { url: redirectUrl });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "doSomething") {
        if (!SETTINGS.tts) {
            sendResponse({ error: "Model not loaded yet" });
            return true;
        }
        SETTINGS.speak(message.data);
        return true;
    }
});