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

// Generate controlled random positions within bounds
const generatePosition = (index: number, total: number) => {
  const angle = (index / total) * Math.PI * 2;
  const radius = Math.min(window.innerWidth, window.innerHeight) * 0.3;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
};

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
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
      
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
              stroke="rgba(0, 122, 255, 0.1)"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            />
          ))
        )}
      </svg>
      
      {/* Floating Memojis */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => {
          const initialPos = generatePosition(i, 6);
          const nextPos = generatePosition((i + 2) % 6, 6);
          const finalPos = generatePosition((i + 4) % 6, 6);
          
          return (
            <motion.div
              key={i}
              className="absolute w-20 h-20 rounded-full"
              initial={{
                x: initialPos.x,
                y: initialPos.y,
                scale: 0.9,
              }}
              animate={{
                x: [initialPos.x, nextPos.x, finalPos.x],
                y: [initialPos.y, nextPos.y, finalPos.y],
                scale: [0.9, 1, 0.9],
              }}
              transition={{
                duration: 45,
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
          );
        })}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-semibold text-gray-900 mb-8 tracking-tight"
        >
          Your connections available now through voice
        </motion.h1>

        {/* Example Queries Slider */}
        <motion.div
          key={currentQueryIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="text-xl md:text-2xl text-gray-600 mt-12 font-medium"
        >
          <span className="text-gray-400">Try asking: </span>
          <span className="text-gray-900">{exampleQueries[currentQueryIndex]}</span>
        </motion.div>

        {/* Subtle decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-24 h-0.5 bg-gray-200 mx-auto mt-12"
        />
      </div>
    </div>
  );
} 