"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Search, Loader } from "lucide-react";
import { Contact } from "@/lib/utils";

interface VoiceSearchInterfaceProps {
  isConnected: boolean;
  isSearching: boolean;
  currentQuery: string;
  searchResults: Contact[];
  onConnect: () => void;
}

export function VoiceSearchInterface({ 
  isConnected, 
  isSearching, 
  currentQuery, 
  searchResults, 
  onConnect 
}: VoiceSearchInterfaceProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            🎤 Voice-Powered Network Search
          </h2>
          <p className="text-gray-300">
            Speak naturally to search your professional network
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center mb-6">
          {!isConnected ? (
            <motion.button
              onClick={onConnect}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
            >
              <Mic className="w-5 h-5" />
              Start Voice Search
            </motion.button>
          ) : (
            <div className="flex items-center gap-3 text-green-400">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Voice Assistant Connected</span>
              <Mic className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Live Status */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSearching ? (
                  <>
                    <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-blue-300 font-medium">
                      Searching your network...
                    </span>
                  </>
                ) : currentQuery ? (
                  <>
                    <Search className="w-5 h-5 text-green-400" />
                    <span className="text-green-300 font-medium">
                      Search completed
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-300 font-medium">
                      Listening... Try saying "Find designers" or "Who do I know at Google?"
                    </span>
                  </>
                )}
              </div>
              
              {currentQuery && (
                <div className="text-right">
                  <div className="text-xs text-gray-400">Last query:</div>
                  <div className="text-sm text-white font-medium">"{currentQuery}"</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Results Summary */}
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{searchResults.length}</span>
              </div>
              <div>
                <div className="text-green-300 font-medium">
                  Found {searchResults.length} contact{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="text-gray-300 text-sm">
                  Results displayed below • Speak again to refine search
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Voice Commands Help */}
        {isConnected && !isSearching && !currentQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-gray-400 text-sm"
          >
            <p className="mb-2">Try voice commands like:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>"Find software engineers"</div>
              <div>"Who do I know at Microsoft?"</div>
              <div>"Show me designers in San Francisco"</div>
              <div>"People with React skills"</div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 