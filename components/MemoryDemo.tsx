'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, Mic, Volume2 } from 'lucide-react';

interface MemoryResult {
  success: boolean;
  person?: string;
  details?: string;
  confirmationMessage?: string;
  message?: string;
  memories?: Array<{
    person: string;
    details: string;
    timestamp: string;
    score: number;
  }>;
}

export default function MemoryDemo() {
  const [captureText, setCaptureText] = useState('');
  const [recallQuery, setRecallQuery] = useState('');
  const [captureResult, setCaptureResult] = useState<MemoryResult | null>(null);
  const [recallResult, setRecallResult] = useState<MemoryResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecalling, setIsRecalling] = useState(false);

  const handleCaptureMemory = async () => {
    if (!captureText.trim()) return;
    
    setIsCapturing(true);
    try {
      const response = await fetch('/api/capture-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: captureText, 
          userId: 'demo-user' 
        })
      });
      
      const result = await response.json();
      setCaptureResult(result);
      
      // Clear text on successful capture
      if (result.success) {
        setCaptureText('');
      }
    } catch (error) {
      console.error('Error capturing memory:', error);
      setCaptureResult({ 
        success: false, 
        message: 'Failed to capture memory' 
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRecallMemory = async () => {
    if (!recallQuery.trim()) return;
    
    setIsRecalling(true);
    try {
      const response = await fetch('/api/recall-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: recallQuery, 
          userId: 'demo-user' 
        })
      });
      
      const result = await response.json();
      setRecallResult(result);
    } catch (error) {
      console.error('Error recalling memory:', error);
      setRecallResult({ 
        success: false, 
        message: 'Failed to recall memory' 
      });
    } finally {
      setIsRecalling(false);
    }
  };

  const sampleMemories = [
    "I met Sarah today, she works at Google as a software engineer",
    "Just talked to John Smith, he's a product manager at Microsoft",
    "Maria from the conference is a UX designer at Apple",
    "Met David at the networking event, he's the CEO of a startup called TechFlow"
  ];

  const sampleQueries = [
    "Where does Sarah work?",
    "What does John do?",
    "Tell me about Maria",
    "Who is the CEO?"
  ];

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <Brain className="h-8 w-8 text-blue-600" />
          Voice-Driven Memory System
        </h1>
        <p className="text-gray-600">
          Capture and recall memories about people using natural language
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Capture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Capture Memory
            </CardTitle>
            <CardDescription>
              Tell me about someone you met and I'll save it for later recall
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: I met Sarah today, she works at Google as a software engineer"
              value={captureText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaptureText(e.target.value)}
              rows={3}
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCaptureMemory}
                disabled={!captureText.trim() || isCapturing}
                className="flex-1"
              >
                {isCapturing ? 'Saving...' : 'Save Memory'}
              </Button>
            </div>

            {/* Sample memories */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Try these examples:</p>
              <div className="space-y-1">
                {sampleMemories.map((memory, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCaptureText(memory)}
                    className="text-xs text-left text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded w-full transition-colors"
                  >
                    "{memory}"
                  </button>
                ))}
              </div>
            </div>

            {/* Capture Result */}
            {captureResult && (
              <div className={`p-3 rounded border ${
                captureResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                {captureResult.success ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-green-800 font-medium">
                        {captureResult.confirmationMessage}
                      </p>
                      {captureResult.confirmationMessage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => speakText(captureResult.confirmationMessage!)}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 space-x-2">
                      <Badge variant="secondary">{captureResult.person}</Badge>
                      <span className="text-sm text-gray-600">{captureResult.details}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-800">
                    {captureResult.message || 'Failed to capture memory'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memory Recall Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Recall Memory
            </CardTitle>
            <CardDescription>
              Ask questions about people you've met
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: Where does Sarah work?"
              value={recallQuery}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRecallQuery(e.target.value)}
              rows={2}
            />
            
            <Button 
              onClick={handleRecallMemory}
              disabled={!recallQuery.trim() || isRecalling}
              className="w-full"
            >
              {isRecalling ? 'Searching...' : 'Search Memories'}
            </Button>

            {/* Sample queries */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Try these questions:</p>
              <div className="space-y-1">
                {sampleQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setRecallQuery(query)}
                    className="text-xs text-left text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded w-full transition-colors"
                  >
                    "{query}"
                  </button>
                ))}
              </div>
            </div>

            {/* Recall Result */}
            {recallResult && (
              <div className={`p-3 rounded border ${
                recallResult.success 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                {recallResult.success ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-blue-800 font-medium">
                        {recallResult.message}
                      </p>
                      {recallResult.message && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => speakText(recallResult.message!)}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {recallResult.memories && recallResult.memories.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Related memories:</p>
                        {recallResult.memories.slice(0, 3).map((memory, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border text-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{memory.person}</Badge>
                              <span className="text-xs text-gray-500">
                                {(memory.score * 100).toFixed(0)}% match
                              </span>
                            </div>
                            <p className="mt-1 text-gray-600">{memory.details}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-yellow-800">
                    {recallResult.message || 'No memories found'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">💾 Capturing Memories</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Mention a person's name</li>
              <li>• Include what they do or where they work</li>
              <li>• Use natural language like "I met..."</li>
              <li>• The system extracts and stores the key info</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">🔍 Recalling Memories</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Ask specific questions about people</li>
              <li>• Use names: "Where does Sarah work?"</li>
              <li>• Or ask broadly: "Who works at Google?"</li>
              <li>• The system finds relevant memories</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 