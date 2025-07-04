"use client";

import { memo, useCallback, useEffect, useState, useMemo, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Room, RoomEvent } from "livekit-client";
import { Contact } from "@/lib/utils";
import { RoomContext } from "@livekit/components-react";

// Lazy load heavy components
const VoiceInterface = lazy(() => import("@/components/VoiceInterface"));
const Navigation = lazy(() => import("@/components/Navigation").then(mod => ({ default: mod.Navigation })));
const HeroSection = lazy(() => import("@/components/HeroSection").then(mod => ({ default: mod.HeroSection })));
const UploadPanel = lazy(() => import("@/components/UploadPanel").then(mod => ({ default: mod.UploadPanel })));
const OptimizedContactStatus = lazy(() => import("@/components/OptimizedContactStatus"));

// Loading skeleton components
const NavigationSkeleton = memo(() => (
  <div className="fixed top-0 left-0 right-0 z-50 h-20 bg-white/80 backdrop-blur-md animate-pulse" />
));

const ContentSkeleton = memo(() => (
  <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl animate-pulse">
    <div className="h-64 bg-gray-200 rounded-2xl"></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-96 bg-gray-200 rounded-2xl"></div>
      <div className="h-96 bg-gray-200 rounded-2xl"></div>
    </div>
  </div>
));

NavigationSkeleton.displayName = 'NavigationSkeleton';
ContentSkeleton.displayName = 'ContentSkeleton';

// Memoized device failure handler
const onDeviceFailure = (error: Error) => {
  console.error("Device failure:", error);
};

const OptimizedPage = memo(() => {
  // Core state management
  const [room] = useState(() => new Room());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // Memoized contact upload handler
  const handleContactsUploaded = useCallback(async (newContacts: Contact[], type: 'linkedin' | 'instagram') => {
    console.log(`Uploading ${newContacts.length} ${type} contacts to Pinecone...`);
    setIsUploading(true);
    
    try {
      const response = await fetch('/api/upload-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: newContacts, type }),
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

  // Memoized voice toggle handler
  const handleVoiceToggle = useCallback(() => {
    if (isVoiceConnected) {
      room.disconnect();
    } else {
      // Connection logic is handled in VoiceInterface component
    }
  }, [isVoiceConnected, room]);

  // Memoized upload panel toggle
  const handleUploadToggle = useCallback(() => {
    setShowUploadPanel(prev => !prev);
  }, []);

  // Room event handlers with cleanup
  useEffect(() => {
    const handleConnected = () => setIsVoiceConnected(true);
    const handleDisconnected = () => setIsVoiceConnected(false);

    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);
    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room]);

  // Memoized navigation section
  const navigationSection = useMemo(() => (
    <Suspense fallback={<NavigationSkeleton />}>
      <Navigation 
        isVoiceConnected={isVoiceConnected}
        onVoiceToggle={handleVoiceToggle}
        onUploadClick={handleUploadToggle}
      />
    </Suspense>
  ), [isVoiceConnected, handleVoiceToggle, handleUploadToggle]);

  // Memoized hero section
  const heroSection = useMemo(() => {
    if (isVoiceConnected || showUploadPanel) return null;
    
    return (
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-2xl" />}>
        <HeroSection />
      </Suspense>
    );
  }, [isVoiceConnected, showUploadPanel]);

  // Memoized upload panel
  const uploadPanel = useMemo(() => {
    if (!showUploadPanel) return null;

    return (
      <AnimatePresence>
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          aria-labelledby="upload-section"
        >
          <h2 id="upload-section" className="sr-only">Upload your network data</h2>
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-2xl" />}>
            <UploadPanel 
              onContactsUploaded={handleContactsUploaded}
              isUploading={isUploading}
            />
          </Suspense>
        </motion.section>
      </AnimatePresence>
    );
  }, [showUploadPanel, handleContactsUploaded, isUploading]);

  // Memoized contact status
  const contactStatus = useMemo(() => {
    if (contacts.length === 0 && !isUploading) return null;

    return (
      <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100 rounded-2xl" />}>
        <OptimizedContactStatus 
          contacts={contacts}
          isUploading={isUploading}
        />
      </Suspense>
    );
  }, [contacts, isUploading]);

  // Memoized voice interface
  const voiceInterface = useMemo(() => {
    if (!isVoiceConnected) return null;

    return (
      <Suspense fallback={<ContentSkeleton />}>
        <VoiceInterface
          isVoiceConnected={isVoiceConnected}
          room={room}
          onVoiceToggle={handleVoiceToggle}
          contacts={contacts}
        />
      </Suspense>
    );
  }, [isVoiceConnected, room, handleVoiceToggle, contacts]);

  return (
    <div data-lk-theme="default" className="min-h-screen">
      <RoomContext.Provider value={room}>
        {/* Navigation */}
        {navigationSection}

        {/* Main Content */}
        <main className="pt-20">
          {/* Hero Section */}
          {heroSection}
          
          {/* Content Container */}
          <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">
            {/* Upload Panel */}
            {uploadPanel}
            
            {/* Contact Status */}
            {contactStatus}
            
            {/* Voice Interface */}
            {voiceInterface}
          </div>
        </main>
      </RoomContext.Provider>
    </div>
  );
});

OptimizedPage.displayName = 'OptimizedPage';

export default OptimizedPage;

