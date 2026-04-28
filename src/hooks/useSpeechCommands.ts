"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { matchVoiceToCommand } from "@/lib/voiceMatch";
import type { CmdDef } from "@/lib/voiceMatch";

type Options = {
  commands: CmdDef[];
  /** false ise algılama yapılır ama callback çağrılmaz */
  allowExecute: boolean;
  onMatch: (cmd: CmdDef, transcript: string) => void;
  debounceMs?: number;
};

export function useSpeechCommands({
  commands,
  allowExecute,
  onMatch,
  debounceMs = 850,
}: Options) {
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const allowExecuteRef = useRef(allowExecute);
  const onMatchRef = useRef(onMatch);
  const debounceRef = useRef<{ key: string; t: number }>({ key: "", t: 0 });

  useEffect(() => {
    allowExecuteRef.current = allowExecute;
  }, [allowExecute]);

  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window;
    setSpeechSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!speechSupported || typeof window === "undefined") return;

    const w = window as Window;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    stopListening();
    activeRef.current = true;

    const rec = new SR();
    rec.lang = "tr-TR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0]?.transcript ?? "";
      }
      text = text.trim();
      if (!text) return;
      setLastTranscript(text);

      const cmd = matchVoiceToCommand(text, commands);
      if (!cmd || !allowExecuteRef.current) return;

      const now = Date.now();
      if (
        cmd.key === debounceRef.current.key &&
        now - debounceRef.current.t < debounceMs
      ) {
        return;
      }
      debounceRef.current = { key: cmd.key, t: now };
      onMatchRef.current(cmd, text);
    };

    rec.onerror = () => {
      /* no-speech vb. — sessiz */
    };

    rec.onend = () => {
      if (!activeRef.current) return;
      window.setTimeout(() => {
        if (!activeRef.current || !recRef.current) return;
        try {
          recRef.current.start();
        } catch {
          activeRef.current = false;
          setListening(false);
        }
      }, 120);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      activeRef.current = false;
      setListening(false);
    }
  }, [commands, debounceMs, speechSupported, stopListening]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return {
    speechSupported,
    listening,
    lastTranscript,
    startListening,
    stopListening,
  };
}
