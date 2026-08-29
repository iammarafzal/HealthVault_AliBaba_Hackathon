"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RecordingState = "idle" | "recording" | "processing";

interface AudioRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  state: RecordingState;
  onStateChange: (state: RecordingState) => void;
}

/**
 * Browser audio recording controls using Web Audio API (getUserMedia + MediaRecorder).
 * Shows idle mic button, pulsing red recording animation with timer, and processing spinner.
 */
export default function AudioRecorder({
  onRecordingComplete,
  state,
  onStateChange,
}: AudioRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(4));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ── Format timer ──────────────────────────────────────── */
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /* ── Start recording ───────────────────────────────────── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio analyser for waveform visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1] ?? "";
          onRecordingComplete(base64);
        };
        reader.readAsDataURL(blob);

        // Cleanup stream
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      onStateChange("recording");
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Waveform animation
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const bars = Array(20)
          .fill(0)
          .map((_, i) => {
            const idx = Math.floor((i / 20) * dataArray.length);
            return Math.max(4, (dataArray[idx] / 255) * 32);
          });
        setWaveformBars(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (err) {
      console.warn("[AudioRecorder] Microphone access denied:", err);
      onStateChange("idle");
    }
  }, [onRecordingComplete, onStateChange]);

  /* ── Stop recording ────────────────────────────────────── */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    onStateChange("processing");
    setElapsed(0);
    setWaveformBars(Array(20).fill(4));
  }, [onStateChange]);

  /* ── Cleanup on unmount ────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ── Idle state ──────────────────────────────────── */}
      {state === "idle" && (
        <Button
          onClick={startRecording}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg min-h-[44px] min-w-[44px]"
        >
          <Mic className="h-6 w-6" />
        </Button>
      )}

      {/* ── Recording state ─────────────────────────────── */}
      {state === "recording" && (
        <div className="flex flex-col items-center gap-3">
          {/* Waveform visualizer */}
          <div className="flex h-10 items-center gap-[3px]">
            {waveformBars.map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-destructive transition-all duration-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          {/* Timer */}
          <p className="font-mono text-sm font-bold text-destructive">
            {formatTime(elapsed)}
          </p>

          {/* Pulsing stop button */}
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="relative h-14 w-14 rounded-full shadow-lg min-h-[44px] min-w-[44px]"
            >
              <Square className="h-5 w-5 fill-current" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Tap to stop & send
          </p>
        </div>
      )}

      {/* ── Processing state ────────────────────────────── */}
      {state === "processing" && (
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              "bg-primary/10"
            )}
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              Processing Urdu Query…
            </p>
            <p className="text-xs text-muted-foreground" dir="rtl" lang="ur">
              پروسیسنگ جاری ہے
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
