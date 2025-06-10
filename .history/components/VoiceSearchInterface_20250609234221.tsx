"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Loader, Play, Square } from "lucide-react";
import { Contact } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceVisualizer } from "@/components/VoiceVisualizer";
import { useVoiceAssistant } from "@livekit/components-react";

interface VoiceSearchInterfaceProps {
  isConnected: boolean;
  isSearching: boolean;
  currentQuery: string;
  searchResults: Contact[];
  onConnect: () => void;
  currentTranscript?: string;
}

export function VoiceSearchInterface({ 
  isConnected, 
  isSearching, 
  currentQuery, 
  searchResults, 
  onConnect,
  currentTranscript = ""
}: VoiceSearchInterfaceProps) {
  const { state: agentState } = useVoiceAssistant();
  const isListening = agentState === "listening";
  const isSpeaking = agentState === "speaking";
  const isThinking = agentState === "thinking";

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6 space-y-6">
        
        {/* LiveKit Status Indicator */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-600"
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

        {/* Large Voice Button */}
        <div className="flex flex-col items-center space-y-4">
          {!isConnected ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onConnect}
                size="lg"
                className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg text-white border-0"
                aria-label="Connect to voice assistant"
              >
                <Play className="w-8 h-8" />
              </Button>
            </motion.div>
          ) : (
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
                  isListening ? "Listening - speak now" :
                  isThinking ? "Processing your request" :
                  isSpeaking ? "AI assistant is speaking" :
                  "Tap to speak"
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
               isListening ? "Ask about your contacts - try 'Find designers'" :
               isThinking ? "Analyzing your request and searching..." :
               isSpeaking ? "AI assistant is responding" :
               "Ready for your next question"}
            </p>
          </div>
        </div>

        {/* Live Transcription */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4 min-h-[60px] border"
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
            className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  Searching your network...
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Looking through your contacts for relevant matches
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Results Summary */}
        {searchResults.length > 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{searchResults.length}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-green-700 dark:text-green-300">
                  Found {searchResults.length} contact{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Results shown below • Ask a follow-up question anytime
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Voice Commands Help - Mobile First */}
        {isConnected && !isSearching && !currentQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center space-y-3"
          >
            <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Find software engineers",
                "Who do I know at Google?",
                "Show me designers",
                "People in San Francisco"
              ].map((command, index) => (
                <span 
                  key={index}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-muted-foreground"
                >
                  "{command}"
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
} 