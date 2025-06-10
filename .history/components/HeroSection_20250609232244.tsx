import { motion, useMotionValue, useTransform, ResolvedValues } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

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

interface MemojiPosition {
  x: number;
  y: number;
  id: number;
}

export function HeroSection() {
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [memojiPositions, setMemojiPositions] = useState<MemojiPosition[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQueryIndex((prev) => (prev + 1) % exampleQueries.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateMemojiPosition = (id: number, x: number, y: number) => {
    setMemojiPositions(prev => {
      const newPositions = [...prev];
      const index = newPositions.findIndex(pos => pos.id === id);
      if (index !== -1) {
        newPositions[index] = { x, y, id };
      } else {
        newPositions.push({ x, y, id });
      }
      return newPositions;
    });
  };

  return (
    <div className="relative min-h-[85vh] bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* SVG Container for connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {memojiPositions.map((pos1, i) => 
          memojiPositions.slice(i + 1).map((pos2, j) => (
            <motion.line
              key={`${pos1.id}-${pos2.id}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke="rgba(0, 122, 255, 0.08)"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
            />
          ))
        )}
      </svg>
      
      {/* Floating Memojis */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight - 100,
                Math.random() * window.innerHeight,
              ],
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth + (Math.random() > 0.5 ? 50 : -50),
                Math.random() * window.innerWidth,
              ],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.5, 1],
            }}
            onUpdate={(latest: ResolvedValues) => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                updateMemojiPosition(
                  i,
                  Number(latest.x) + rect.left + 40,
                  Number(latest.y) + rect.top + 40
                );
              }
            }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">👤</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-4xl md:text-6xl font-medium text-gray-900 mb-6 tracking-tight"
        >
          Your network,<br />
          <span className="text-blue-600">now voice-enabled</span>
        </motion.h1>

        {/* Example Queries Slider */}
        <motion.div
          key={currentQueryIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="text-lg md:text-xl text-gray-500 mt-8 font-normal"
        >
          <span className="text-gray-400">Try asking: </span>
          <span className="text-gray-700">{exampleQueries[currentQueryIndex]}</span>
        </motion.div>

        {/* Subtle decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-16 h-0.5 bg-gray-100 mx-auto mt-10"
        />
      </div>
    </div>
  );
} 