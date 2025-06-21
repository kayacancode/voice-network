"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, Star, Mic } from "lucide-react";
import { BriefCard } from "@/components/BriefCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNextMeeting, getBriefForContact, mockCalendarEvents, ContactBrief } from "@/lib/mockData";

export default function DemoPage() {
  const [currentBriefing, setCurrentBriefing] = useState<ContactBrief | null>(null);
  const [nextMeeting, setNextMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoResponse, setDemoResponse] = useState("");

  useEffect(() => {
    // Load next meeting on page load
    const meeting = getNextMeeting();
    setNextMeeting(meeting);
  }, []);

  const handleCalendarBriefing = async () => {
    setIsLoading(true);
    setDemoResponse("");
    
    try {
      // Simulate the voice command "Who am I meeting next?"
      const response = await fetch('/api/calendar-brief', {
        method: 'GET',
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentBriefing(result.brief);
        setDemoResponse(result.spokenBrief);
      } else {
        setDemoResponse(result.message || "No upcoming meetings found.");
      }
    } catch (error) {
      console.error('Error fetching briefing:', error);
      setDemoResponse("Sorry, I had trouble accessing your calendar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonBriefing = async (personName: string) => {
    setIsLoading(true);
    setDemoResponse("");
    
    try {
      const response = await fetch('/api/calendar-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `Brief me on ${personName}`,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentBriefing(result.brief);
        setDemoResponse(result.spokenBrief);
      } else {
        setDemoResponse(result.message || `I don't have briefing information for ${personName}.`);
      }
    } catch (error) {
      console.error('Error fetching briefing:', error);
      setDemoResponse("Sorry, I had trouble retrieving that briefing.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeUntilMeeting = (meetingTime: Date) => {
    const now = new Date();
    const diffMs = meetingTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} minutes`;
    } else {
      return `${Math.round(diffMins / 60)} hours`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">
            QuickBrief Demo
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Fast Calendar Demo Mode - Voice AI for Professional Meeting Context
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Demo Mode Active</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Demo Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Next Meeting Card */}
            <Card className="bg-white/80 border border-border/40 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Your Next Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextMeeting ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{nextMeeting.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {nextMeeting.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            {formatTimeUntilMeeting(nextMeeting.start)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {nextMeeting.start.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{nextMeeting.attendees.length} attendee(s)</span>
                      <span className="text-primary font-medium">
                        {nextMeeting.meeting_type}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No upcoming meetings found.</p>
                )}
              </CardContent>
            </Card>

            {/* Demo Voice Commands */}
            <Card className="bg-white/80 border border-border/40 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mic className="w-5 h-5 text-primary" />
                  Voice Commands Demo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Try these voice commands to see QuickBrief in action:
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={handleCalendarBriefing}
                    disabled={isLoading}
                    className="w-full justify-start h-auto p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    <div className="text-left">
                      <div className="font-medium">"Who am I meeting next?"</div>
                      <div className="text-xs opacity-80">Get your next meeting briefing</div>
                    </div>
                  </Button>

                  <div className="grid grid-cols-1 gap-2">
                    {["Sarah Chen", "Marcus Johnson", "Elena Rodriguez"].map((name) => (
                      <Button
                        key={name}
                        onClick={() => handlePersonBriefing(name)}
                        disabled={isLoading}
                        variant="outline"
                        className="justify-start h-auto p-3 border-border/40 hover:bg-primary/5"
                      >
                        <div className="text-left">
                          <div className="font-medium">"Brief me on {name}"</div>
                          <div className="text-xs text-muted-foreground">
                            Get detailed contact briefing
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Response */}
            {demoResponse && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-indigo-50 border border-indigo-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-indigo-700">
                      <Star className="w-5 h-5" />
                      AI Response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-indigo-700 leading-relaxed">
                      {demoResponse}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Right Panel - Visual Briefing */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {currentBriefing ? (
              <BriefCard 
                brief={currentBriefing} 
                isLoading={isLoading}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-12 text-center border border-border/50 bg-white/60"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Visual Briefing Ready
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Click any voice command on the left to see a detailed visual briefing 
                  with contact background, conversation starters, and follow-up suggestions.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Features Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <Card className="bg-white/80 border border-border/40 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                QuickBrief Features
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Voice-first AI assistant for professional meeting context
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Calendar Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic briefings for upcoming meetings with context and background
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Contact Intelligence</h4>
                  <p className="text-sm text-muted-foreground">
                    Rich contact profiles with relationship history and influence scoring
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                    <Mic className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Voice-First Interface</h4>
                  <p className="text-sm text-muted-foreground">
                    Natural voice commands for instant briefings and context switching
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 