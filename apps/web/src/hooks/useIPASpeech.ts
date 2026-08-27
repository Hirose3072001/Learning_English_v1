import { useCallback } from "react";

export const useIPASpeech = () => {
  // Phát âm từ URL hoặc fallback sang Web Speech API
  const speak = useCallback((audioUrl: string | null, text: string = "") => {
    // Nếu có URL âm thanh, phát âm file audio
    if (audioUrl && audioUrl.trim()) {
      // Dừng âm thanh trước đó
      const existingAudio = document.getElementById("ipa-audio") as HTMLAudioElement;
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.currentTime = 0;
      }

      // Tạo hoặc cập nhật element audio
      let audio = document.getElementById("ipa-audio") as HTMLAudioElement;
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "ipa-audio";
        audio.crossOrigin = "anonymous";
        document.body.appendChild(audio);
      }

      audio.src = audioUrl;
      audio.play().catch((error) => {
        console.warn("Failed to play audio:", error);
        // Fallback: dùng Web Speech API
        fallbackSpeak(text);
      });
      return;
    }

    // Fallback: nếu không có URL, dùng Web Speech API
    fallbackSpeak(text);
  }, []);

  const fallbackSpeak = useCallback((text: string) => {
    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    const audio = document.getElementById("ipa-audio") as HTMLAudioElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  return { speak, stop };
};
