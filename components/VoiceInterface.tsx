"use client";

import { memo, useCallback, useEffect, useState, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room, RoomEvent } from "livekit-client";
import { Contact, ConversationState } from "@/lib/utils";
import { ContactBrief } from "@/lib/mockData";
import type { ConnectionDetails } from "@/app/api/connection-details/route";

// Lazy load heavy components
const VoiceSearchInterface = lazy(() => import("@/components/VoiceSearchInterface").then(mod => ({ default: mod.VoiceSearchInterface })));
const SearchResults = lazy(() => import("@/components/SearchResults").then(mod => ({ default: mod.SearchResults })));
const BriefCard = lazy(() => import("@/components/BriefCard").then(mod => ({ default: mod.BriefCard })));

interface VoiceInterfaceProps {
  isVoiceConnected: boolean;
  room: Room;
  onVoiceToggle: () => void;
  contacts: Contact[];
}

interface VoiceQueryHandlers {
  handleVoiceQuery: (transcript: string, agentResponse?: string) => Promise<void>;
  handleBriefingQuery: (transcript: string) => Promise<void>;
  handleRelationshipQuery: (transcript: string, target?: any) => Promise<string>;
  generateSearchResponse: (results: Contact[], query: string) => Promise<string>;
}

// Memoized loading skeleton
const LoadingSkeleton = memo(() => (
  <div className="animate-pulse">
    <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

const VoiceInterface = memo<VoiceInterfaceProps>(({ 
  isVoiceConnected, 
  room, 
  onVoiceToggle, 
  contacts 
}) => {
  // Optimized state management with useMemo for initial state
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [responseType, setResponseType] = useState<'search' | 'memory' | 'general' | 'relationship' | 'briefing'>('general');
  const [currentBriefing, setCurrentBriefing] = useState<ContactBrief | null>(null);
  
  const initialConversationState = useMemo(() => ({
    prior_queries: [],
    prior_results: [],
    context: "",
  }), []);
  
  const [conversationState, setConversationState] = useState<ConversationState>(initialConversationState);

  // Memoized handlers to prevent re-renders
  const handlers = useMemo<VoiceQueryHandlers>(() => ({
    handleBriefingQuery: async (transcript: string) => {
      try {
        const response = await fetch('/api/calendar-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: transcript }),
        });

        const result = await response.json();
        
        if (result.success && result.brief) {
          setCurrentBriefing(result.brief);
        }
      } catch (error) {
        console.error('Error fetching briefing:', error);
      }
    },

    handleRelationshipQuery: async (transcript: string, target?: any): Promise<string> => {
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: queryType,
            query: transcript,
            target: extractedTarget,
          }),
        });

        const result = await response.json();
        return result.success ? result.message : (result.error || "I couldn't analyze that relationship intelligence request.");
      } catch (error) {
        console.error('Error processing relationship query:', error);
        return "I had trouble analyzing that relationship. Please try again.";
      }
    },

    generateSearchResponse: async (results: Contact[], query: string): Promise<string> => {
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
    },

    handleVoiceQuery: async (transcript: string, agentResponse?: string) => {
      if (!transcript.trim()) return;

      setIsSearching(true);
      setCurrentQuery(transcript);
      setAssistantResponse("");
      setSearchResults([]);

      try {
        // Determine intent from the transcript or agent response
        const isMemoryCapture = transcript.toLowerCase().includes('met') || 
                                transcript.toLowerCase().includes('talked to') ||
                                agentResponse?.toLowerCase().includes('saved');
        
        const isMemoryRecall = transcript.toLowerCase().includes('where does') || 
                              transcript.toLowerCase().includes('what does') ||
                              transcript.toLowerCase().includes('tell me about') ||
                              agentResponse?.toLowerCase().includes('you mentioned');

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
          setAssistantResponse(agentResponse);
          if (isMemoryCapture || isMemoryRecall) {
            setResponseType('memory');
          } else if (isRelationshipQuery) {
            setResponseType('relationship');
          } else if (isBriefingQuery) {
            setResponseType('briefing');
            await handlers.handleBriefingQuery(transcript);
          } else {
            setResponseType('general');
          }
        } else {
          if (isRelationshipQuery) {
            const relationshipResponse = await handlers.handleRelationshipQuery(transcript);
            setAssistantResponse(relationshipResponse);
            setResponseType('relationship');
          } else if (isBriefingQuery) {
            const briefingResponse = await fetch('/api/calendar-brief', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: transcript }),
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
            // Process with LLM
            const llmResponse = await fetch('/api/llm-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_transcript: transcript,
                conversation_state: conversationState,
              }),
            });

            const llmResult = await llmResponse.json();
            
            if (llmResult.success) {
              setConversationState(llmResult.updated_conversation_state);

              if (llmResult.intent === 'search' || llmResult.intent === 'refine') {
                const searchResponse = await fetch('/api/search-contacts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    query: llmResult.refined_query,
                    topK: 20,
                  }),
                });

                const searchResult = await searchResponse.json();
                if (searchResult.success) {
                  setSearchResults(searchResult.results);
                  setResponseType('search');
                  
                  const responseText = await handlers.generateSearchResponse(searchResult.results, transcript);
                  setAssistantResponse(responseText);
                }
              } else if (llmResult.intent === 'relationship_analysis' || llmResult.intent === 'warm_intro' || llmResult.intent === 'network_path') {
                const relationshipResponse = await handlers.handleRelationshipQuery(transcript, llmResult.relationship_target);
                setAssistantResponse(relationshipResponse);
                setResponseType('relationship');
              } else {
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
    }
  }), [conversationState]);

  const onConnectButtonClicked = useCallback(async () => {
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );
    const response = await fetch(url.toString());
    const connectionDetailsData: ConnectionDetails = await response.json();

    await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
    await room.localParticipant.setMicrophoneEnabled(true);
  }, [room]);

  // Memoized component sections
  const voiceSearchSection = useMemo(() => (
    <section aria-labelledby="voice-section" className="lg:order-1">
      <h2 id="voice-section" className="sr-only">Voice search interface</h2>
      <div className="sticky top-28 space-y-4">
        <Suspense fallback={<LoadingSkeleton />}>
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
        </Suspense>
      </div>
    </section>
  ), [isVoiceConnected, isSearching, currentQuery, searchResults, currentTranscript, assistantResponse, responseType, onConnectButtonClicked]);

  const resultsSection = useMemo(() => (
    <section aria-labelledby="results-section" className="lg:order-2">
      <h2 id="results-section" className="sr-only">Search results</h2>
      
      {/* Briefing Card */}
      {responseType === 'briefing' && currentBriefing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            <BriefCard brief={currentBriefing} />
          </Suspense>
        </motion.div>
      )}
      
      {/* Search Results */}
      {responseType === 'search' && (searchResults.length > 0 || (isSearching && currentQuery)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            <SearchResults
              results={searchResults}
              isLoading={isSearching}
              query={currentQuery}
            />
          </Suspense>
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
  ), [responseType, currentBriefing, searchResults, isSearching, currentQuery, assistantResponse]);

  if (!isVoiceConnected) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {voiceSearchSection}
      {resultsSection}
    </motion.div>
  );
});

VoiceInterface.displayName = 'VoiceInterface';

export default VoiceInterface;