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
const driftX = (Math.random() - 0.5) * 20;   // between -10px and +10px
const driftY = (Math.random() - 0.5) * 20;   // between -10px and +10px
const rotateAmount = (Math.random() - 0.5) * 2; // between -1° and +1°
const duration    = 150 + Math.random() * 100; // 150–250 seconds
const delay       = Math.random() * 60;        // up to 60s stagger

const memojiImages = [
  "/memojis/emoji1.png",
  "/memojis/emoji2.png",
  "/memojis/emoji3.png",
  "/memojis/emoji4.png",
  "/memojis/emoji5.png",
  "/memojis/emoji6.png",
];

interface MemojiPosition {
  x: number;
  y: number;
  id: number;
}

function getRandomMemoji() {
  return memojiImages[Math.floor(Math.random() * memojiImages.length)];
}

function getRandomStart(max: number, margin: number = 50) {
  return margin + Math.random() * (max - margin * 2);
}

export function HeroSection() {
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [memojiPositions, setMemojiPositions] = useState<MemojiPosition[]>([]);
  const [assignedMemojiImages] = useState(() =>
    Array.from({ length: 6 }, () => getRandomMemoji())
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQueryIndex((prev) => (prev + 1) % exampleQueries.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Get viewport size for initial positions
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  useEffect(() => {
    function update() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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
        {[...Array(6)].map((_, i) => {
          // Pick a random start position for each bubble with better distribution
          const gridX = (i % 3) * (viewport.width / 3) + getRandomStart(viewport.width / 3, 20);
          const gridY = Math.floor(i / 3) * (viewport.height / 2) + getRandomStart(viewport.height / 2, 20);
          const startX = Math.min(Math.max(gridX, 50), viewport.width - 50);
          const startY = Math.min(Math.max(gridY, 50), viewport.height - 50);
          const driftX = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 40); // 30-70px movement
          const driftY = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 40); // 30-70px movement
          const rotateAmount = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3); // 2-5deg rotation
          const duration = 15 + Math.random() * 10; // 15-25 seconds per cycle (much faster)
          const delay = Math.random() * 5; // Stagger the start of each bubble up to 5s
          const memojiImg = assignedMemojiImages[i];
          
          return (
            <motion.div
              key={i}
              className="absolute w-20 h-20 rounded-full"
              initial={{
                x: startX,
                y: startY,
                rotate: 0,
                scale: 1,
              }}
              animate={{
                x: startX + driftX,
                y: startY + driftY,
                rotate: rotateAmount,
                scale: 1.01,
              }}
              transition={{
                duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
                delay,
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
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm flex items-center justify-center backdrop-blur-sm overflow-hidden">
                <img
                  src={memojiImg}
                  alt={`Memoji ${i + 1}`}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
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