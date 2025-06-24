import { motion, useMotionValue, useTransform, ResolvedValues } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

const exampleQueries = [
  "Find engineers at Google",
  "Who can introduce me to VCs?",
  "Show me product managers in San Francisco", 
  "Connect me with startup founders",
  "Find designers at Apple",
  "Who's hiring in fintech?",
  "Show me sales leaders at Microsoft",
  "Connect me with marketing directors",
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function HeroSection() {
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentQueryIndex((prev) => (prev + 1) % exampleQueries.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-hero flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-accent/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-primary/4 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='currentColor' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>

      {/* Main Content */}
      <motion.div 
        className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-24 md:pt-28"
        variants={staggerContainer}
        initial="initial"
        animate={isVisible ? "animate" : "initial"}
      >
        {/* Badge */}
        <motion.div variants={fadeInUp}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-sm font-medium mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            AI-powered professional networking
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          variants={fadeInUp}
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight leading-none"
        >
          <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Leverage
          </span>
          <br />
          your network
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeInUp}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light"
        >
          Unlock the power of your professional connections with voice-driven search and AI insights. 
          Find the right people, discover warm introductions, and expand your opportunities instantly.
        </motion.p>

        {/* Example Queries */}
        <motion.div variants={fadeInUp} className="mb-16">
          <p className="text-muted-foreground mb-4 text-lg font-medium">Try asking:</p>
          <div className="relative h-8 flex items-center justify-center">
            <motion.span
              key={currentQueryIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute text-xl md:text-2xl font-medium bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
            >
              &quot;{exampleQueries[currentQueryIndex]}&quot;
            </motion.span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button className="group relative px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-lg transition-all duration-200 shadow-premium hover:shadow-premium-lg transform hover:-translate-y-0.5">
            <span className="relative z-10">Unlock Your Network</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
          
          <button className="px-8 py-4 bg-card/60 hover:bg-card/80 text-foreground border border-border hover:border-primary/30 rounded-xl font-semibold text-lg transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md">
            Upload Your Network
          </button>
        </motion.div>

        {/* Feature Pills */}
        <motion.div variants={fadeInUp} className="flex flex-wrap gap-3 justify-center items-center">
          {[
            "Network Intelligence",
            "Warm Introductions",
            "Opportunity Discovery", 
            "Professional Insights"
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + index * 0.1, duration: 0.4 }}
              className="px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full text-sm font-medium text-muted-foreground border border-border/40 shadow-sm"
            >
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
    </div>
  );
} 