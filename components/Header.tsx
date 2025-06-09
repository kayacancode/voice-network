"use client";

import { Mic } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold">
            AI Voice Network
          </h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            Help
          </button>
        </nav>
      </div>
    </header>
  );
} 