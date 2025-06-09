"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VoiceVisualizerProps {
  isActive: boolean;
  className?: string;
  barCount?: number;
}

export function VoiceVisualizer({ 
  isActive, 
  className = "", 
  barCount = 8 
}: VoiceVisualizerProps) {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    // Initialize with random heights
    setBars(Array.from({ length: barCount }, () => Math.random() * 0.8 + 0.2));
  }, [barCount]);

  useEffect(() => {
    if (!isActive) {
      // Fade out all bars when not active
      setBars(Array.from({ length: barCount }, () => 0.1));
      return;
    }

    // Animate bars when active
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 0.9 + 0.1));
    }, 150);

    return () => clearInterval(interval);
  }, [isActive, barCount]);

  return (
    <div 
      className={`flex items-end justify-center gap-1 h-16 ${className}`}
      role="presentation"
      aria-label={isActive ? "AI assistant is speaking" : "AI assistant is silent"}
    >
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className={`w-2 rounded-full transition-colors duration-300 ${
            isActive 
              ? "bg-gradient-to-t from-blue-500 to-purple-500" 
              : "bg-gray-600"
          }`}
          animate={{
            height: `${height * 100}%`,
            opacity: isActive ? 1 : 0.3
          }}
          transition={{
            duration: 0.15,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
} 