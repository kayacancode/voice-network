import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const exampleQueries = [
  "Anyone hiring?",
  "Who's single?",
  "Going to NYC who lives there?",
  "Looking for a roommate",
  "Who's into hiking?",
  "Need a tennis partner",
  "Who works in tech?",
  "Looking for a mentor",
];

export function HeroSection() {
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQueryIndex((prev) => (prev + 1) % exampleQueries.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-[80vh] bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* Floating Memojis */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
        >
          Your connections available now through voice
        </motion.h1>

        {/* Example Queries Slider */}
        <motion.div
          key={currentQueryIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="text-xl md:text-2xl text-gray-600 mt-8"
        >
          Try asking: "{exampleQueries[currentQueryIndex]}"
        </motion.div>
      </div>
    </div>
  );
} 