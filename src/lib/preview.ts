import type { DEFAULT_SETTINGS } from "./utils";

export function speakPreview(settings: typeof DEFAULT_SETTINGS) {
  const sampleText =
    "Hello, this is a preview of your Talking AI voice settings.";

  const utterance = new SpeechSynthesisUtterance(sampleText);

  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;

  if (settings.voice) {
    const voice = speechSynthesis
      .getVoices()
      .find(v => v.voiceURI === settings.voice);
    if (voice) utterance.voice = voice;
  }

  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(utterance), 50);
}
