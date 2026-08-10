"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API interface declarations
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface UseSpeechRecognitionOptions {
  silenceTimeoutMs?: number; // silence threshold (default 2500ms)
  onSilenceDetected?: (finalTranscript: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  isSilenceCounting: boolean;
  startListening: (options?: { continuous?: boolean; lang?: string }) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isSilenceCounting, setIsSilenceCounting] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldBeListeningRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestTranscriptRef = useRef("");
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsSilenceCounting(false);
  };

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    const timeoutMs = optionsRef.current?.silenceTimeoutMs || 2500;
    setIsSilenceCounting(true);
    silenceTimerRef.current = setTimeout(() => {
      setIsSilenceCounting(false);
      if (optionsRef.current?.onSilenceDetected && latestTranscriptRef.current.trim()) {
        optionsRef.current.onSilenceDetected(latestTranscriptRef.current.trim());
      }
    }, timeoutMs);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentFinal = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          currentFinal += result[0].transcript + " ";
        } else {
          currentInterim += result[0].transcript;
        }
      }

      if (currentFinal) {
        setTranscript((prev) => {
          const next = prev ? prev.trim() + " " + currentFinal.trim() : currentFinal.trim();
          latestTranscriptRef.current = next;
          return next;
        });
      }
      setInterimTranscript(currentInterim);

      // Candidate has spoken, reset/start silence timer
      if (currentFinal || currentInterim) {
        startSilenceTimer();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission denied. Please allow microphone access.");
        shouldBeListeningRef.current = false;
        setIsListening(false);
        clearSilenceTimer();
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      if (shouldBeListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [startSilenceTimer]);

  const startListening = useCallback((options?: { continuous?: boolean; lang?: string }) => {
    clearSilenceTimer();
    if (!recognitionRef.current) {
      if (typeof window !== "undefined") {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError("Speech recognition is not supported in this browser.");
          return;
        }
      }
      return;
    }

    setError(null);
    if (options?.lang) {
      recognitionRef.current.lang = options.lang;
    }
    if (options?.continuous !== undefined) {
      recognitionRef.current.continuous = options.continuous;
    }

    shouldBeListeningRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {}
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const resetTranscript = useCallback(() => {
    clearSilenceTimer();
    setTranscript("");
    setInterimTranscript("");
    latestTranscriptRef.current = "";
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    isSilenceCounting,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
