"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { CalendarIcon, CheckCircleIcon } from "lucide-react";

interface GoogleCalendarAuthProps {
  onAuthSuccess?: () => void;
}

export function GoogleCalendarAuth({ onAuthSuccess }: GoogleCalendarAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<any>(null);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const authenticated = !!session?.user;
      setIsAuthenticated(authenticated);
      
      // If authenticated, sync calendar data
      if (authenticated && (session as any).accessToken) {
        await syncCalendarData();
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    }
  };

  const syncCalendarData = async () => {
    try {
      // Get the current session to extract access token
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      
      if (!session || !(session as any).accessToken) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: (session as any).accessToken
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setCalendarData(result);
        console.log('Calendar data synced:', result);
      } else {
        const error = await response.json();
        console.error('Failed to sync calendar data:', error);
      }
    } catch (err) {
      console.error('Error syncing calendar data:', err);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use NextAuth to sign in with Google
      const { signIn } = await import('next-auth/react');
      const result = await signIn('google', { 
        callbackUrl: window.location.href,
        redirect: false 
      });
      
      if (result?.error) {
        setError('Failed to authenticate with Google Calendar');
      } else if (result?.ok) {
        setIsAuthenticated(true);
        // Sync calendar data after successful authentication
        await syncCalendarData();
        onAuthSuccess?.();
      }
    } catch (err) {
      setError('An error occurred during authentication');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('next-auth/react');
      await signOut({ redirect: false });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Google Calendar Connected
            </p>
            <p className="text-xs text-green-600">
              {calendarData?.eventCount 
                ? `${calendarData.eventCount} events synced - You can now ask about your meetings and schedule`
                : "You can now ask about your meetings and schedule"
              }
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="text-green-700 border-green-300 hover:bg-green-100"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center space-x-3 mb-4">
        <CalendarIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Connect Google Calendar
          </h3>
          <p className="text-sm text-gray-600">
            Ask about your meetings and schedule using voice commands
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">•</span>
          <span>"Who am I meeting with next?"</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">•</span>
          <span>"What's my schedule today?"</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">•</span>
          <span>"When am I meeting with Sarah?"</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Connecting...
          </>
        ) : (
          <>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Connect Google Calendar
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 mt-3">
        We only request read-only access to your calendar to provide meeting information.
        Your calendar data is never stored or shared.
      </p>
    </div>
  );
} 