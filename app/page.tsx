"use client";

import { CloseIcon } from "@/components/CloseIcon";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import { UploadPanel } from "@/components/UploadPanel";
import { SearchResults } from "@/components/SearchResults";
import { ContactStatus } from "@/components/ContactStatus";
import { VoiceSearchInterface } from "@/components/VoiceSearchInterface";
import { BriefCard } from "@/components/BriefCard";
import { HeroSection } from "@/components/HeroSection";
import { Navigation } from "@/components/Navigation";
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  VideoTrack,
  VoiceAssistantControlBar,
  useVoiceAssistant,
  useRoomContext,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { Room, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import { Contact, ConversationState } from "@/lib/utils";
import { ContactBrief } from "@/lib/mockData";
import type { ConnectionDetails } from "./api/connection-details/route";

export default function Page() {
  const [room] = useState(new Room());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState("");
  const [responseType, setResponseType] = useState<'search' | 'memory' | 'general' | 'relationship' | 'briefing'>('general');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [currentBriefing, setCurrentBriefing] = useState<ContactBrief | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>({
    prior_queries: [],
    prior_results: [],
    context: "",
  });

  const handleContactsUploaded = useCallback(async (newContacts: Contact[], type: 'linkedin' | 'instagram') => {
    console.log(`Uploading ${newContacts.length} ${type} contacts to Pinecone...`);
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: newContacts,
          type,
        }),
      });

      const result = await response.json();
      console.log('Upload API response:', result);
      
      if (result.success) {
        setContacts(prev => [...prev, ...newContacts]);
        console.log(`Successfully uploaded ${result.uploadedCount} ${type} contacts`);
      } else {
        console.error('Failed to upload contacts:', result.error);
      }
    } catch (error) {
      console.error('Error uploading contacts:', error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleVoiceQuery = useCallback(async (transcript: string, agentResponse?: string) => {
    if (!transcript.trim()) return;

    setIsSearching(true);
    setCurrentQuery(transcript);
    setAssistantResponse(""); // Clear previous response
    setSearchResults([]); // Clear previous search results

    try {
      // Determine intent from the transcript or agent response
      const isMemoryCapture = transcript.toLowerCase().includes('met') || 
                              transcript.toLowerCase().includes('talked to') ||
                              agentResponse?.toLowerCase().includes('saved');
      
      const isMemoryRecall = transcript.toLowerCase().includes('where does') || 
                            transcript.toLowerCase().includes('what does') ||
                            transcript.toLowerCase().includes('tell me about') ||
                            agentResponse?.toLowerCase().includes('you mentioned');

      // Check for relationship intelligence queries
      const isRelationshipQuery = transcript.toLowerCase().includes('who can introduce') ||
                                 transcript.toLowerCase().includes('path to') ||
                                 transcript.toLowerCase().includes('warm intro') ||
                                 transcript.toLowerCase().includes('how to reach') ||
                                 transcript.toLowerCase().includes('best way to approach') ||
                                 transcript.toLowerCase().includes('connections at') ||
                                 transcript.toLowerCase().includes('influence') ||
                                 transcript.toLowerCase().includes('decision maker');

      const isBriefingQuery = transcript.toLowerCase().includes('next meeting') ||
                             transcript.toLowerCase().includes('who am i meeting') ||
                             transcript.toLowerCase().includes('upcoming meeting') ||
                             transcript.toLowerCase().includes('brief me on') ||
                             transcript.toLowerCase().includes('tell me about');

              if (agentResponse) {
          // If we have an agent response, use it directly
          setAssistantResponse(agentResponse);
          if (isMemoryCapture || isMemoryRecall) {
            setResponseType('memory');
          } else if (isRelationshipQuery) {
            setResponseType('relationship');
          } else if (isBriefingQuery) {
            setResponseType('briefing');
            // Try to extract briefing data for visual display
            await handleBriefingQuery(transcript);
          } else {
            setResponseType('general');
          }
        } else {
                  // Handle relationship intelligence queries
          if (isRelationshipQuery) {
            const relationshipResponse = await handleRelationshipQuery(transcript);
            setAssistantResponse(relationshipResponse);
            setResponseType('relationship');
          } else if (isBriefingQuery) {
            // Handle briefing queries
            const briefingResponse = await fetch('/api/calendar-brief', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: transcript,
              }),
            });

            const briefingResult = await briefingResponse.json();
            if (briefingResult.success) {
              setAssistantResponse(briefingResult.spokenBrief || briefingResult.message);
              setResponseType('briefing');
              if (briefingResult.brief) {
                setCurrentBriefing(briefingResult.brief);
              }
            } else {
              setAssistantResponse(briefingResult.message || "I couldn't retrieve that briefing information.");
              setResponseType('general');
            }
          } else {
          // First, process the query with LLM
          const llmResponse = await fetch('/api/llm-query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_transcript: transcript,
              conversation_state: conversationState,
            }),
          });

          const llmResult = await llmResponse.json();
          
          if (llmResult.success) {
            setConversationState(llmResult.updated_conversation_state);

            if (llmResult.intent === 'search' || llmResult.intent === 'refine') {
              // Perform the search
              const searchResponse = await fetch('/api/search-contacts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: llmResult.refined_query,
                  topK: 20,
                }),
              });

              const searchResult = await searchResponse.json();
              if (searchResult.success) {
                setSearchResults(searchResult.results);
                setResponseType('search');
                
                // Generate a natural language response for the search results
                const responseText = await generateSearchResponse(searchResult.results, transcript);
                setAssistantResponse(responseText);
              }
            } else if (llmResult.intent === 'relationship_analysis' || llmResult.intent === 'warm_intro' || llmResult.intent === 'network_path') {
              // Handle relationship intelligence from LLM
              const relationshipResponse = await handleRelationshipQuery(transcript, llmResult.relationship_target);
              setAssistantResponse(relationshipResponse);
              setResponseType('relationship');
            } else {
              // For non-search queries, set a general response
              setResponseType('general');
              setAssistantResponse(llmResult.response || "I understand your request.");
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing voice query:', error);
      setAssistantResponse("I'm sorry, I had trouble processing that request.");
      setResponseType('general');
    } finally {
      setIsSearching(false);
    }
  }, [conversationState]);

  const handleBriefingQuery = async (transcript: string) => {
    try {
      const response = await fetch('/api/calendar-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: transcript,
        }),
      });

      const result = await response.json();
      
      if (result.success && result.brief) {
        setCurrentBriefing(result.brief);
      }
    } catch (error) {
      console.error('Error fetching briefing:', error);
    }
  };

  const handleRelationshipQuery = async (transcript: string, target?: any): Promise<string> => {
    try {
      let queryType = 'analyze_influence';
      let extractedTarget = target;

      // Extract target information from transcript if not provided
      if (!extractedTarget) {
        if (transcript.toLowerCase().includes('connections at') || transcript.toLowerCase().includes('people at')) {
          queryType = 'company_connections';
          const companyMatch = transcript.match(/(?:connections at|people at)\s+([A-Z][a-zA-Z\s]+)/i);
          if (companyMatch) {
            extractedTarget = { company: companyMatch[1].trim() };
          }
        } else if (transcript.toLowerCase().includes('path to') || transcript.toLowerCase().includes('how to reach')) {
          queryType = 'find_path';
          const nameMatch = transcript.match(/(?:path to|how to reach)\s+([A-Z][a-zA-Z\s]+)/i);
          if (nameMatch) {
            extractedTarget = { name: nameMatch[1].trim() };
          }
        } else {
          // Default to influence analysis
          const nameMatch = transcript.match(/(?:about|approach|influence of|tell me about)\s+([A-Z][a-zA-Z\s]+)/i);
          if (nameMatch) {
            extractedTarget = { name: nameMatch[1].trim() };
          }
        }
      }

      if (!extractedTarget) {
        return "I couldn't identify who or what company you're asking about. Could you be more specific?";
      }

      const response = await fetch('/api/relationship-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: queryType,
          query: transcript,
          target: extractedTarget,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        return result.message;
      } else {
        return result.error || "I couldn't analyze that relationship intelligence request.";
      }
    } catch (error) {
      console.error('Error processing relationship query:', error);
      return "I had trouble analyzing that relationship. Please try again.";
    }
  };

  const generateSearchResponse = async (results: Contact[], query: string): Promise<string> => {
    if (results.length === 0) {
      return `I couldn't find any contacts matching "${query}". You might want to try a different search term or upload more contacts to your network.`;
    }

    if (results.length === 1) {
      const contact = results[0];
      return `I found ${contact.name}${contact.title ? `, who is a ${contact.title}` : ''}${contact.company ? ` at ${contact.company}` : ''}${contact.location ? ` in ${contact.location}` : ''}. ${contact.industry ? `They work in the ${contact.industry} industry.` : ''}`;
    }

    // Multiple results - create a summary
    const topContacts = results.slice(0, 3);
    const companies = Array.from(new Set(topContacts.map(c => c.company).filter(Boolean)));
    const titles = Array.from(new Set(topContacts.map(c => c.title).filter(Boolean)));
    
    let response = `I found ${results.length} contacts matching "${query}". `;
    
    if (companies.length > 0) {
      response += `They work at companies like ${companies.slice(0, 3).join(', ')}. `;
    }
    
    if (titles.length > 0) {
      response += `The roles include ${titles.slice(0, 3).join(', ')}. `;
    }
    
    response += `The top matches are ${topContacts.map(c => c.name).join(', ')}.`;
    
    return response;
  };

  const onConnectButtonClicked = useCallback(async () => {
    // Generate room connection details
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );
    const response = await fetch(url.toString());
    const connectionDetailsData: ConnectionDetails = await response.json();

    await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
    await room.localParticipant.setMicrophoneEnabled(true);
  }, [room]);

  const handleVoiceToggle = useCallback(() => {
    if (isVoiceConnected) {
      room.disconnect();
    } else {
      onConnectButtonClicked();
    }
  }, [isVoiceConnected, room, onConnectButtonClicked]);

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);
    room.on(RoomEvent.Connected, () => setIsVoiceConnected(true));
    room.on(RoomEvent.Disconnected, () => setIsVoiceConnected(false));

    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
      room.off(RoomEvent.Connected, () => setIsVoiceConnected(true));
      room.off(RoomEvent.Disconnected, () => setIsVoiceConnected(false));
    };
  }, [room]);

  return (
    <div data-lk-theme="default" className="min-h-screen">
      <RoomContext.Provider value={room}>
        {/* Navigation */}
        <Navigation 
          isVoiceConnected={isVoiceConnected}
          onVoiceToggle={handleVoiceToggle}
          onUploadClick={() => setShowUploadPanel(!showUploadPanel)}
        />

        {/* Main Content */}
        <main className="pt-20">
          {/* Hero Section - Only show when no voice connection */}
          {!isVoiceConnected && !showUploadPanel && (
            <HeroSection />
          )}
          
          {/* Content Container */}
          <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">
            {/* Upload Panel - Toggleable */}
            <AnimatePresence>
              {showUploadPanel && (
                <motion.section
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  aria-labelledby="upload-section"
                >
                  <h2 id="upload-section" className="sr-only">Upload your network data</h2>
                  <UploadPanel 
                    onContactsUploaded={handleContactsUploaded}
                    isUploading={isUploading}
                  />
                </motion.section>
              )}
            </AnimatePresence>
            
            {/* Contact Status - Only show when we have contacts */}
            {contacts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ContactStatus 
                  contacts={contacts}
                  isUploading={isUploading}
                />
              </motion.div>
            )}
            
            {/* Voice Interface & Results - Only show when voice connected */}
            {isVoiceConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Voice Search Panel */}
                <section 
                  aria-labelledby="voice-section"
                  className="lg:order-1"
                >
                  <h2 id="voice-section" className="sr-only">Voice search interface</h2>
                  <div className="sticky top-28 space-y-4">
                    <VoiceSearchInterface
                      isConnected={isVoiceConnected}
                      isSearching={isSearching}
                      currentQuery={currentQuery}
                      searchResults={searchResults}
                      currentTranscript={currentTranscript}
                      assistantResponse={assistantResponse}
                      responseType={responseType}
                      onConnect={onConnectButtonClicked}
                    />
                    
                    {/* Hidden Voice Assistant for processing */}
                    <div className="hidden">
                      <SimpleVoiceAssistant 
                        onConnectButtonClicked={onConnectButtonClicked}
                        onVoiceQuery={handleVoiceQuery}
                        onTranscriptUpdate={setCurrentTranscript}
                      />
                    </div>
                  </div>
                </section>
                
                                  {/* Results Panel */}
                <section 
                  aria-labelledby="results-section"
                  className="lg:order-2"
                >
                  <h2 id="results-section" className="sr-only">Search results</h2>
                  
                  {/* Briefing Card */}
                  {responseType === 'briefing' && currentBriefing && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <BriefCard brief={currentBriefing} />
                    </motion.div>
                  )}
                  
                  {/* Search Results */}
                  {responseType === 'search' && (searchResults.length > 0 || (isSearching && currentQuery)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SearchResults
                        results={searchResults}
                        isLoading={isSearching}
                        query={currentQuery}
                      />
                    </motion.div>
                  )}
                  
                  {/* Empty State for Results */}
                  {!assistantResponse && !searchResults.length && !isSearching && !currentQuery && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="glass rounded-2xl p-12 text-center border border-border/50"
                    >
                      <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">Ready to search</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        Use voice commands to search your network, save memories, or ask questions.
                      </p>
                    </motion.div>
                  )}
                </section>
              </motion.div>
            )}
          </div>
        </main>
      </RoomContext.Provider>
    </div>
  );
}

function SimpleVoiceAssistant(props: { 
  onConnectButtonClicked: () => void;
  onVoiceQuery?: (transcript: string, agentResponse?: string) => void;
  onTranscriptUpdate?: (transcript: string) => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const room = useRoomContext();

  return (
    <>
      <AnimatePresence mode="wait">
        {agentState === "disconnected" ? (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="grid items-center justify-center h-full"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="uppercase px-4 py-2 bg-white text-black rounded-md"
              onClick={() => props.onConnectButtonClicked()}
            >
              Start a conversation
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="flex flex-col items-center gap-4 h-full"
          >
            <AgentVisualizer />
            <div className="flex-1 w-full">
              {room?.state === "connected" && (agentState === "listening" || agentState === "thinking" || agentState === "speaking" || agentState === "initializing") && (
                <TranscriptionView 
                  onVoiceQuery={props.onVoiceQuery} 
                  onTranscriptUpdate={props.onTranscriptUpdate}
                />
              )}
            </div>
            <div className="w-full">
              <ControlBar onConnectButtonClicked={props.onConnectButtonClicked} />
            </div>
            <RoomAudioRenderer />
            <NoAgentNotification state={agentState} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AgentVisualizer() {
  const { state: agentState, videoTrack, audioTrack } = useVoiceAssistant();

  if (videoTrack) {
    return (
      <div className="h-[512px] w-[512px] rounded-lg overflow-hidden">
        <VideoTrack trackRef={videoTrack} />
      </div>
    );
  }
  return (
    <div className="h-[300px] w-full">
      <BarVisualizer
        state={agentState}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer"
        options={{ minHeight: 24 }}
      />
    </div>
  );
}

function ControlBar(props: { onConnectButtonClicked: () => void }) {
  const { state: agentState } = useVoiceAssistant();

  return (
    <div className="relative h-[60px]">
      <AnimatePresence>
        {agentState === "disconnected" && (
          <motion.button
            initial={{ opacity: 0, top: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="uppercase absolute left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-black rounded-md"
            onClick={() => props.onConnectButtonClicked()}
          >
            Start a conversation
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {agentState !== "disconnected" && agentState !== "connecting" && (
          <motion.div
            initial={{ opacity: 0, top: "10px" }}
            animate={{ opacity: 1, top: 0 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="flex h-8 absolute left-1/2 -translate-x-1/2 justify-center"
          >
            <VoiceAssistantControlBar controls={{ leave: false }} />
            <DisconnectButton>
              <CloseIcon />
            </DisconnectButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingVoiceButton() {
  const { state: agentState } = useVoiceAssistant();
  const isListening = agentState === "listening";
  const isSpeaking = agentState === "speaking";
  const isThinking = agentState === "thinking";

  return (
    <motion.div
      animate={{
        scale: isListening ? [1, 1.1, 1] : 1,
      }}
      transition={{
        duration: isListening ? 2 : 0.3,
        repeat: isListening ? Infinity : 0,
        ease: "easeInOut"
      }}
      className="relative"
    >
      <button
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isListening 
            ? "bg-red-500 text-white" 
            : isThinking || isSpeaking
            ? "bg-yellow-500 text-white"
            : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
        }`}
        aria-label={
          isListening ? "Listening" :
          isThinking ? "Processing" :
          isSpeaking ? "Speaking" :
          "Voice search"
        }
      >
        {isListening ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        ) : isThinking || isSpeaking ? (
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      {/* Pulse effect for listening state */}
      {isListening && (
        <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
      )}
    </motion.div>
  );
}
function onDeviceFailure(error: Error) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}

