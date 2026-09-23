/**
 * ChatInput — textarea + send button + voice input + optional skip-step bar.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Renders the bottom input area of the EMR chat. Includes:
 *   - A resizable Textarea that grows up to 8 lines.
 *   - A microphone button that toggles the browser's Web Speech API for
 *     voice-to-text. Transcribed interim text is shown live in the textarea;
 *     final results are committed to the value. The button is hidden when the
 *     browser does not support SpeechRecognition.
 *   - An icon Send button that is disabled while loading or input is empty.
 *   - A "Skip this step" bar that appears above the input when the current
 *     workflow step is optional and the AI is not loading.
 *
 * Enter submits; Shift+Enter inserts a newline.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, SkipForward, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Web Speech API type shim ──────────────────────────────────────────────────
// The SpeechRecognition API is not in the standard TS lib; declare it minimally.

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

/**
 * Returns the browser's SpeechRecognition constructor, or null if unsupported.
 */
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  /** Controlled input value. */
  value: string;
  /** Setter forwarded to the Zustand store's setInput. */
  onChange: (value: string) => void;
  /** Called when the user submits (button click or Enter). */
  onSend: () => void;
  loading: boolean;
  /** Ref for programmatic focus (e.g., after clicking a suggestion chip). */
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  /** When true, the "Skip this step" bar is shown above the input. */
  currentStepIsOptional: boolean;
  /** Called when the user clicks "Skip this step". */
  onSkip: () => void;
}

/**
 * Controlled chat input area with voice-to-text and an optional skip-step bar.
 *
 * @param props.value                 - Current textarea value.
 * @param props.onChange              - Value change handler.
 * @param props.onSend                - Submit handler.
 * @param props.loading               - Disables the input and shows a spinner.
 * @param props.inputRef              - Ref for programmatic focus.
 * @param props.currentStepIsOptional - Shows the skip bar when true.
 * @param props.onSkip                - Skip-step handler.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  loading,
  inputRef,
  currentStepIsOptional,
  onSkip,
}: ChatInputProps) {
  const [isListening, setIsListening] = useState(false);
  // Detected after mount so server and client first-render agree (avoids hydration mismatch).
  const [speechSupported, setSpeechSupported] = useState(false);
  // Tracks the committed text before the current interim speech result so we
  // can replace the interim portion on each update without duplicating text.
  const committedTextRef = useRef(value);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  // Keep committedTextRef in sync when the user types manually while not recording.
  useEffect(() => {
    if (!isListening) {
      committedTextRef.current = value;
    }
  }, [value, isListening]);

  // Clean up recognition on unmount.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  /** Start or stop voice recognition. */
  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Snapshot the current textarea value as the base before speech starts.
    committedTextRef.current = value;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk) {
        // Commit the final text — append with a space separator.
        const base = committedTextRef.current.trimEnd();
        committedTextRef.current = base ? `${base} ${finalChunk.trim()}` : finalChunk.trim();
      }

      // Show committed text + live interim preview.
      const preview = interimChunk
        ? `${committedTextRef.current} ${interimChunk}`
        : committedTextRef.current;

      onChange(preview);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Ensure the final committed text (no trailing interim) is in the store.
      onChange(committedTextRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Stop recording if active before sending.
      if (isListening) recognitionRef.current?.stop();
      onSend();
    }
  }

  return (
    <>
      {/* Skip optional step bar */}
      {currentStepIsOptional && !loading && (
        <div className="border-t border-border bg-background px-4 py-2 shrink-0">
          <div className="max-w-4xl mx-auto flex justify-end">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <SkipForward className="size-4 mr-2" />
              Skip this step
            </Button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="border-t border-border bg-background p-4 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try "create a patient" or ask anything…'
            disabled={loading}
            rows={1}
            className="flex-1 min-h-0 max-h-32 resize-none"
          />

          {/* Microphone button — hidden when browser does not support the API */}
          {speechSupported && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "shrink-0 size-10 transition-colors",
                isListening && "border-destructive text-destructive hover:bg-destructive/10",
              )}
              onClick={toggleListening}
              disabled={loading}
              aria-label={isListening ? "Stop recording" : "Start voice input"}
              title={isListening ? "Stop recording" : "Voice input"}
            >
              {isListening ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
          )}

          <Button
            onClick={onSend}
            disabled={loading || !value.trim()}
            size="icon"
            className="shrink-0 size-10"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        {/* Live recording indicator */}
        {isListening && (
          <div className="max-w-4xl mx-auto mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            Listening…
          </div>
        )}
      </div>
    </>
  );
}
