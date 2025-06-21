import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Temporary storage for calendar data (in production, use Redis or database)
const CALENDAR_DATA_FILE = path.join(process.cwd(), 'temp_calendar_data.json');

export async function POST(request: NextRequest) {
  try {
    // Get access token from request body instead of session
    const body = await request.json();
    const { accessToken } = body;
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: "Access token required" 
      }, { status: 401 });
    }
    
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

    // Store the calendar data temporarily with timestamp
    const calendarData = {
      events: transformedEvents,
      lastUpdated: new Date().toISOString(),
      authenticated: true
    };

    // Write to temporary file (in production, use proper storage)
    fs.writeFileSync(CALENDAR_DATA_FILE, JSON.stringify(calendarData, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: "Calendar data synced successfully",
      eventCount: transformedEvents.length 
    });

  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar data" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // This endpoint is called by the agent to get calendar data
    if (!fs.existsSync(CALENDAR_DATA_FILE)) {
      return NextResponse.json({ 
        error: "No calendar data available. Please sync your calendar first.",
        authenticated: false 
      }, { status: 404 });
    }

    const calendarData = JSON.parse(fs.readFileSync(CALENDAR_DATA_FILE, 'utf8'));
    
    // Check if data is recent (less than 1 hour old)
    const lastUpdated = new Date(calendarData.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 1) {
      return NextResponse.json({ 
        error: "Calendar data is stale. Please refresh your calendar connection.",
        authenticated: false,
        lastUpdated: calendarData.lastUpdated
      }, { status: 410 });
    }

    return NextResponse.json(calendarData);

  } catch (error) {
    console.error("Calendar data retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve calendar data" },
      { status: 500 }
    );
  }
} 