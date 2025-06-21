import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  try {
    // Check for NextAuth session instead of Bearer token
    const session = await getServerSession();
    
    if (!session || !(session as any).accessToken) {
      return NextResponse.json({ 
        error: "Not authenticated with Google Calendar. Please connect your calendar in the web interface." 
      }, { status: 401 });
    }

    const accessToken = (session as any).accessToken as string;
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Create Calendar API client
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get current date and time for filtering events
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

    // Fetch calendar events
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    // Transform events to include relevant information
    const transformedEvents = events.map((event) => ({
      id: event.id,
      summary: event.summary || "No title",
      description: event.description || "",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      attendees: event.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.displayName || attendee.email?.split("@")[0],
        responseStatus: attendee.responseStatus,
      })) || [],
      location: event.location || "",
      status: event.status,
      created: event.created,
      updated: event.updated,
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
} 