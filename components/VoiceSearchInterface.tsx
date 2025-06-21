"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Loader, Play, Square, Pause } from "lucide-react";
import { Contact } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceVisualizer } from "@/components/VoiceVisualizer";
import { useVoiceAssistant, DisconnectButton, useRoomContext } from "@livekit/components-react";

interface VoiceSearchInterfaceProps {
  isConnected: boolean;
  isSearching: boolean;
  currentQuery: string;
  searchResults: Contact[];
  onConnect: () => void;
  currentTranscript?: string;
  assistantResponse?: string;
  responseType?: 'search' | 'memory' | 'general' | 'relationship' | 'briefing';
}

export function VoiceSearchInterface({ 
  isConnected, 
  isSearching, 
  currentQuery, 
  searchResults, 
  onConnect,
  currentTranscript = "",
  assistantResponse = "",
  responseType = 'general'
}: VoiceSearchInterfaceProps) {
  const { state: agentState } = useVoiceAssistant();
  const room = useRoomContext();
  const isListening = agentState === "listening";
  const isSpeaking = agentState === "speaking";
  const isThinking = agentState === "thinking";

  const handleMainButtonClick = async () => {
    if (!isConnected) {
      // Connect if not connected
      onConnect();
    } else if (isListening) {
      // Stop listening by disabling microphone
      if (room?.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(false);
        // Re-enable after a short delay to allow for new listening session
        setTimeout(async () => {
          if (room?.localParticipant) {
            await room.localParticipant.setMicrophoneEnabled(true);
          }
        }, 500);
      }
    } else if (!isThinking && !isSpeaking) {
      // Ready state - ensure microphone is enabled for listening
      if (room?.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
    }
  };

  return (
    <Card className="w-full bg-white/80 border border-border/40 shadow-premium">
      <CardContent className="p-6 space-y-6">
        
        {/* LiveKit Status Indicator */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected 
                ? "bg-green-100 text-green-700 border border-green-200" 
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`} 
            />
            {isConnected ? "Voice Assistant Active" : "Voice Assistant Disconnected"}
          </motion.div>
        </div>

        {/* Voice Visualizer */}
        <div className="flex justify-center">
          <VoiceVisualizer 
            isActive={isSpeaking} 
            className="w-32"
            barCount={12}
          />
        </div>

        {/* Large Voice Button and Pause Button */}
        <div className="flex flex-col items-center space-y-4">
          {!isConnected ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleMainButtonClick}
                size="lg"
                className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg text-white border-0"
                aria-label="Connect to voice assistant"
              >
                <Play className="w-8 h-8" />
              </Button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Main Voice Button */}
              <motion.div
                animate={{
                  scale: isListening ? [1, 1.1, 1] : 1,
                  boxShadow: isListening 
                    ? ["0 0 0 0 rgba(59, 130, 246, 0.7)", "0 0 0 20px rgba(59, 130, 246, 0)", "0 0 0 0 rgba(59, 130, 246, 0)"]
                    : "0 0 0 0 rgba(59, 130, 246, 0)"
                }}
                transition={{
                  duration: isListening ? 2 : 0.3,
                  repeat: isListening ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <Button
                  onClick={handleMainButtonClick}
                  size="lg"
                  disabled={isThinking || isSpeaking}
                  className={`h-24 w-24 rounded-full shadow-lg border-0 transition-all duration-300 ${
                    isListening 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : isThinking || isSpeaking
                      ? "bg-yellow-500 text-white cursor-not-allowed"
                      : "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  }`}
                  aria-label={
                    isListening ? "Stop listening" :
                    isThinking ? "Processing your request" :
                    isSpeaking ? "AI assistant is speaking" :
                    "Start listening"
                  }
                  aria-live="polite"
                >
                  {isListening ? (
                    <Square className="w-8 h-8" />
                  ) : isThinking || isSpeaking ? (
                    <Loader className="w-8 h-8 animate-spin" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
              </motion.div>

              {/* Pause/Stop Button */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <DisconnectButton>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 w-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600 bg-white shadow-lg transition-all duration-300"
                    aria-label="Disconnect voice assistant"
                  >
                    <Pause className="w-6 h-6" />
                  </Button>
                </DisconnectButton>
              </motion.div>
            </div>
          )}
          
          {/* Status Text */}
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">
              {!isConnected ? "Tap to Start" :
               isListening ? "Listening..." :
               isThinking ? "Processing..." :
               isSpeaking ? "Speaking..." :
               "Tap to Speak"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {!isConnected ? "Connect to start voice searching your network" :
               isListening ? "Click the stop button or say your query" :
               isThinking ? "Analyzing your request and searching..." :
               isSpeaking ? "AI assistant is responding" :
               "Ready for your next question"}
            </p>
            {isConnected && (
              <p className="text-xs text-muted-foreground mt-2">
                Use the pause button to fully disconnect the voice assistant
              </p>
            )}
          </div>
        </div>

        {/* Live Transcription */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 rounded-lg p-4 min-h-[60px] border border-border/30"
          >
            <div className="text-sm text-muted-foreground mb-2">Live Transcription:</div>
            <div 
              className="text-base min-h-[2rem] flex items-center"
              aria-live="polite"
              aria-label="Live transcription"
            >
              {isListening && currentTranscript ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-foreground"
                >
                  {currentTranscript}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="ml-1"
                  >
                    |
                  </motion.span>
                </motion.span>
              ) : currentQuery ? (
                <span className="text-foreground">"{currentQuery}"</span>
              ) : (
                <span className="text-muted-foreground italic">
                  {isListening ? "Listening for your voice..." : "Your voice commands will appear here"}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Search Status */}
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              <div>
                <div className="font-medium text-blue-700">
                  Searching your network...
                </div>
                <div className="text-sm text-blue-600">
                  Looking through your contacts for relevant matches
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Assistant Response */}
        {assistantResponse && !isSearching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-lg p-4 ${
              responseType === 'search' && searchResults.length > 0
                ? "bg-green-50 border border-green-200"
                : responseType === 'memory'
                ? "bg-blue-50 border border-blue-200"
                : responseType === 'relationship'
                ? "bg-orange-50 border border-orange-200"
                : responseType === 'briefing'
                ? "bg-indigo-50 border border-indigo-200"
                : "bg-purple-50 border border-purple-200"
            }`}
          >
            <div className="space-y-3">
              <div className={`font-medium ${
                responseType === 'search' && searchResults.length > 0
                  ? "text-green-700"
                  : responseType === 'memory'
                  ? "text-blue-700"
                  : responseType === 'relationship'
                  ? "text-orange-700"
                  : responseType === 'briefing'
                  ? "text-indigo-700"
                  : "text-purple-700"
              }`}>
                {responseType === 'relationship' ? 'Relationship Intelligence' : 
                 responseType === 'briefing' ? 'Meeting Briefing' : 
                 'AI Assistant Response'}
              </div>
              <div className={`text-sm leading-relaxed ${
                responseType === 'search' && searchResults.length > 0
                  ? "text-green-700"
                  : responseType === 'memory'
                  ? "text-blue-700"
                  : responseType === 'relationship'
                  ? "text-orange-700"
                  : responseType === 'briefing'
                  ? "text-indigo-700"
                  : "text-purple-700"
              }`}>
                {assistantResponse}
              </div>
              {responseType === 'search' && searchResults.length > 0 && (
                <div className="text-xs text-green-600 pt-2 border-t border-green-200">
                  {searchResults.length} contact{searchResults.length !== 1 ? 's' : ''} found • See details below
                </div>
              )}
              {responseType === 'relationship' && (
                <div className="text-xs text-orange-600 pt-2 border-t border-orange-200">
                  🧠 Relationship analysis complete • Ask for more details anytime
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Results Summary - Only for search results */}
        {searchResults.length > 0 && !isSearching && responseType === 'search' && !assistantResponse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{searchResults.length}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-green-700">
                  Found {searchResults.length} contact{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-green-600">
                  Results shown below • Ask a follow-up question anytime
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Voice Commands Help - Mobile First */}
        {isConnected && !isSearching && !currentQuery && !assistantResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center space-y-3"
          >
            <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Who am I meeting next?",
                "Brief me on Sarah Chen",
                "Find designers at Google", 
                "How to reach Elon Musk",
                "Connections at OpenAI",
                "I met John at the conference"
              ].map((command, index) => (
                <span 
                  key={index}
                  className="text-xs px-3 py-1.5 bg-gray-100 rounded-full text-muted-foreground border border-gray-200"
                >
                  "{command}"
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-4 space-y-1">
              <p>📅 <strong>Meeting Briefings:</strong> "Who am I meeting next?" • "Brief me on Sarah Chen"</p>
              <p>🔍 <strong>Search:</strong> "Find designers" • "Show me VCs"</p>
              <p>🧠 <strong>Relationship Intelligence:</strong> "Path to Mark Zuckerberg" • "Connections at Meta"</p>
              <p>💭 <strong>Memory:</strong> "I met John at the conference" • "Where does Sarah work?"</p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
} 