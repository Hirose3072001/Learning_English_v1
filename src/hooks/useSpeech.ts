import { useCallback, useRef } from "react";

export const useSpeech = () => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, lang: string = "en-US") => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find an English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (voice) => voice.lang.startsWith("en") && voice.name.includes("Google")
    ) || voices.find((voice) => voice.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
};
