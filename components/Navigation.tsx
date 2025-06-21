"use client";

import { motion } from "framer-motion";
import { Sparkles, Upload, Search, Mic, MicOff } from "lucide-react";
import { useState } from "react";

interface NavigationProps {
  isVoiceConnected?: boolean;
  onVoiceToggle?: () => void;
  onUploadClick?: () => void;
}

export function Navigation({ isVoiceConnected, onVoiceToggle, onUploadClick }: NavigationProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-2xl border border-border/40 p-4 shadow-premium">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-2 bg-primary rounded-xl shadow-sm">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-foreground">AIVoice</h1>
                <p className="text-xs text-muted-foreground">Contact Search</p>
              </div>
            </motion.div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-3">
              {/* Upload Button */}
              <motion.button
                onClick={onUploadClick}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white/80 border border-border/60 hover:border-primary/30 rounded-xl text-sm font-medium text-foreground transition-all duration-200 shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload className="w-4 h-4" />
                Upload Contacts
              </motion.button>

              {/* Voice Toggle */}
              <motion.button
                onClick={onVoiceToggle}
                className={`relative overflow-hidden px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isVoiceConnected
                    ? "bg-primary text-primary-foreground shadow-premium"
                    : "bg-white/60 hover:bg-white/80 border border-border/60 hover:border-primary/30 text-foreground shadow-sm hover:shadow-md"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
              >
                <div className="relative z-10 flex items-center gap-2">
                  {isVoiceConnected ? (
                    <>
                      <Mic className="w-4 h-4" />
                      <span className="hidden md:inline">Voice Active</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span className="hidden md:inline">Start Voice</span>
                    </>
                  )}
                </div>
                
                {/* Animated background for voice active state */}
                {isVoiceConnected && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary to-accent"
                    animate={{ 
                      opacity: isHovered ? 0.9 : 0.7,
                      scale: isHovered ? 1.05 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>

              {/* Mobile Upload Button */}
              <motion.button
                onClick={onUploadClick}
                className="md:hidden p-2 bg-white/60 hover:bg-white/80 border border-border/60 hover:border-primary/30 rounded-xl text-foreground transition-all duration-200 shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
} 