"use client";

import { CloseIcon } from "@/components/CloseIcon";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import { UploadPanel } from "@/components/UploadPanel";
import { SearchResults } from "@/components/SearchResults";
import { ContactStatus } from "@/components/ContactStatus";
import { VoiceSearchInterface } from "@/components/VoiceSearchInterface";
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
import type { ConnectionDetails } from "./api/connection-details/route";

export default function Page() {
  const [room] = useState(new Room());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    prior_queries: [],
    prior_results: [],
    context: "",
  });

  const handleContactsUploaded = useCallback(async (newContacts: Contact[], type: 'linkedin' | 'instagram') => {
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

  const handleVoiceQuery = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    setIsSearching(true);
    setCurrentQuery(transcript);

    try {
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
          }
        }
      }
    } catch (error) {
      console.error('Error processing voice query:', error);
    } finally {
      setIsSearching(false);
    }
  }, [conversationState]);

  const onConnectButtonClicked = useCallback(async () => {
    // Generate room connection details, including:
    //   - A random Room name
    //   - A random Participant name
    //   - An Access Token to permit the participant to join the room
    //   - The URL of the LiveKit server to connect to
    //
    // In real-world application, you would likely allow the user to specify their
    // own participant name, and possibly to choose from existing rooms to join.

    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );
    const response = await fetch(url.toString());
    const connectionDetailsData: ConnectionDetails = await response.json();

    await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
    await room.localParticipant.setMicrophoneEnabled(true);
  }, [room]);

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);

    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
    };
  }, [room]);

  return (
    <main data-lk-theme="default" className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <RoomContext.Provider value={room}>
        <div className="container mx-auto px-4 py-8">
          {/* Upload Panel - Always visible at the top */}
          <UploadPanel 
            onContactsUploaded={handleContactsUploaded}
            isUploading={isUploading}
          />
          
          {/* Contact Status */}
          <ContactStatus 
            contacts={contacts}
            isUploading={isUploading}
          />
          
          {/* Voice Assistant */}
          <div className="mt-8">
            <div className="w-full max-w-4xl mx-auto bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <SimpleVoiceAssistant 
                onConnectButtonClicked={onConnectButtonClicked}
                onVoiceQuery={handleVoiceQuery}
              />
            </div>
          </div>
          
          {/* Search Results */}
          {(searchResults.length > 0 || isSearching || currentQuery) && (
            <div className="mt-8">
              <SearchResults
                results={searchResults}
                isLoading={isSearching}
                query={currentQuery}
              />
            </div>
          )}
        </div>
      </RoomContext.Provider>
    </main>
  );
}

function SimpleVoiceAssistant(props: { 
  onConnectButtonClicked: () => void;
  onVoiceQuery?: (transcript: string) => void;
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
                <TranscriptionView onVoiceQuery={props.onVoiceQuery} />
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
            className="flex h-8 absolute left-1/2 -translate-x-1/2  justify-center"
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

function onDeviceFailure(error: Error) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
