import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import * as React from "react";

interface TranscriptionViewProps {
  onVoiceQuery?: (transcript: string) => void;
  onTranscriptUpdate?: (transcript: string) => void;
}

export default function TranscriptionView({ onVoiceQuery, onTranscriptUpdate }: TranscriptionViewProps) {
  const combinedTranscriptions = useCombinedTranscriptions();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastProcessedRef = React.useRef<string>("");

  // scroll to bottom when new transcription is added
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [combinedTranscriptions]);

  // Process user voice input for search queries
  React.useEffect(() => {
    if (!onVoiceQuery) return;

    const userTranscriptions = combinedTranscriptions.filter(
      segment => segment.role === "user" && segment.text.trim().length > 0
    );

    if (userTranscriptions.length > 0) {
      const latestUser = userTranscriptions[userTranscriptions.length - 1];
      
      // Only process if this is a new transcription
      if (latestUser.text !== lastProcessedRef.current && latestUser.text.trim().length > 5) {
        lastProcessedRef.current = latestUser.text;
        
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          onVoiceQuery(latestUser.text);
        }, 0);
      }
    }
  }, [combinedTranscriptions, onVoiceQuery]);

  // Provide real-time transcript updates for live display
  React.useEffect(() => {
    if (!onTranscriptUpdate) return;

    const userTranscriptions = combinedTranscriptions.filter(
      segment => segment.role === "user" && segment.text.trim().length > 0
    );

    if (userTranscriptions.length > 0) {
      const latestUser = userTranscriptions[userTranscriptions.length - 1];
      onTranscriptUpdate(latestUser.text);
    } else {
      onTranscriptUpdate("");
    }
  }, [combinedTranscriptions, onTranscriptUpdate]);

  return (
    <div className="relative h-[200px] w-[512px] max-w-[90vw] mx-auto">
      {/* Fade-out gradient mask */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[var(--lk-bg)] to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--lk-bg)] to-transparent z-10 pointer-events-none" />

      {/* Scrollable content */}
      <div ref={containerRef} className="h-full flex flex-col gap-2 overflow-y-auto px-4 py-8">
        {combinedTranscriptions.map((segment) => (
          <div
            id={segment.id}
            key={segment.id}
            className={
              segment.role === "assistant"
                ? "p-2 self-start fit-content"
                : "bg-gray-800 rounded-md p-2 self-end fit-content"
            }
          >
            {segment.text}
          </div>
        ))}
      </div>
    </div>
  );
}
