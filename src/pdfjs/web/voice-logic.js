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


function removeVoicePopup() {
    const existing = document.getElementById('pdf-speak-btn');
    if (existing) existing.remove();
}
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


// 1. Monitor the document for text selection
document.addEventListener('mouseup', function () {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    console.log("Checking Selection: ", selection, text);
    if (text.length > 0 && text.length < 2000) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        showVoicePopup(rect.left, rect.top, text);
    } else {
        removeVoicePopup();
    }
});

// 2. Create the floating UI button
function showVoicePopup(x, y, text) {
    removeVoicePopup(); // Clean up old buttons

    const btn = document.createElement('button');
    btn.id = 'pdf-speak-btn';
    btn.innerHTML = '🔊 Read Aloud';

    // Styling to make it look like a clean Chrome UI element
    Object.assign(btn.style, {
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

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log("Speak button clicked");
        speak(text);
    });

    document.body.appendChild(btn);
}


// 4. Hide popup if user clicks elsewhere
document.addEventListener('mousedown', (e) => {
    if (e.target.id !== 'pdf-speak-btn') {
        removeVoicePopup();
    }
});