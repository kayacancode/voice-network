"""
Google Calendar Service for AI Voice Network Assistant
Handles fetching and processing calendar events for voice queries
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json

# Google Calendar API imports
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

class CalendarService:
    def __init__(self):
        self.service = None
        self.credentials = None
        
    def authenticate(self, credentials_json: Optional[str] = None) -> bool:
        """
        Authenticate with Google Calendar API using OAuth2
        
        Args:
            credentials_json: JSON string of OAuth2 credentials
            
        Returns:
            bool: True if authentication successful
        """
        try:
            creds = None
            # The file token.json stores the user's access and refresh tokens.
            if os.path.exists('token.json'):
                creds = Credentials.from_authorized_user_file('token.json', SCOPES)
            
            # If there are no (valid) credentials available, let the user log in.
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if credentials_json:
                        # Use provided credentials
                        creds_info = json.loads(credentials_json)
                        flow = InstalledAppFlow.from_client_config(creds_info, SCOPES)
                        creds = flow.run_local_server(port=0)
                    else:
                        logger.error("No credentials provided for Google Calendar authentication")
                        return False
                        
                # Save the credentials for the next run
                with open('token.json', 'w') as token:
                    token.write(creds.to_json())
            
            self.credentials = creds
            self.service = build('calendar', 'v3', credentials=creds)
            logger.info("Google Calendar authentication successful")
            return True
            
        except Exception as e:
            logger.error(f"Calendar authentication failed: {e}")
            return False
    
    def get_upcoming_events(self, max_results: int = 10, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """
        Fetch upcoming calendar events
        
        Args:
            max_results: Maximum number of events to return
            days_ahead: Number of days ahead to search
            
        Returns:
            List of calendar events
        """
        if not self.service:
            logger.error("Calendar service not authenticated")
            return []
            
        try:
            # Get current time and time range
            now = datetime.utcnow()
            time_min = now.isoformat() + 'Z'  # 'Z' indicates UTC time
            time_max = (now + timedelta(days=days_ahead)).isoformat() + 'Z'
            
            # Call the Calendar API
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # Transform events for easier processing
            transformed_events = []
            for event in events:
                transformed_event = {
                    'id': event.get('id', ''),
                    'summary': event.get('summary', 'No title'),
                    'description': event.get('description', ''),
                    'start': event.get('start', {}).get('dateTime', event.get('start', {}).get('date', '')),
                    'end': event.get('end', {}).get('dateTime', event.get('end', {}).get('date', '')),
                    'location': event.get('location', ''),
                    'status': event.get('status', ''),
                    'attendees': [],
                    'organizer': event.get('organizer', {}),
                    'created': event.get('created', ''),
                    'updated': event.get('updated', '')
                }
                
                # Process attendees
                if 'attendees' in event:
                    for attendee in event['attendees']:
                        transformed_event['attendees'].append({
                            'email': attendee.get('email', ''),
                            'displayName': attendee.get('displayName', attendee.get('email', '').split('@')[0]),
                            'responseStatus': attendee.get('responseStatus', 'needsAction'),
                            'optional': attendee.get('optional', False)
                        })
                
                transformed_events.append(transformed_event)
            
            logger.info(f"Retrieved {len(transformed_events)} calendar events")
            return transformed_events
            
        except HttpError as error:
            logger.error(f"An error occurred: {error}")
            return []
    
    def find_next_meeting(self) -> Optional[Dict[str, Any]]:
        """
        Find the next upcoming meeting
        
        Returns:
            Dict with next meeting details or None
        """
        events = self.get_upcoming_events(max_results=5, days_ahead=7)
        
        now = datetime.utcnow()
        
        for event in events:
            start_time_str = event.get('start', '')
            if start_time_str:
                try:
                    # Parse the start time with proper timezone handling
                    if 'T' in start_time_str:  # DateTime format
                        if start_time_str.endswith('Z'):
                            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                        else:
                            start_time = datetime.fromisoformat(start_time_str)
                            # Convert to UTC for comparison if timezone-aware
                            if start_time.tzinfo is not None:
                                start_time = start_time.utctimetuple()
                                start_time = datetime(*start_time[:6])
                    else:  # Date format
                        start_time = datetime.fromisoformat(start_time_str)
                    
                    # Check if this event is in the future
                    if start_time > now:
                        return event
                        
                except ValueError as e:
                    logger.error(f"Error parsing date: {e}")
                    continue
        
        return None
    
    def search_meetings_by_attendee(self, attendee_name: str) -> List[Dict[str, Any]]:
        """
        Search for meetings with a specific attendee
        
        Args:
            attendee_name: Name or email to search for
            
        Returns:
            List of matching meetings
        """
        events = self.get_upcoming_events(max_results=50, days_ahead=30)
        matching_events = []
        
        attendee_name_lower = attendee_name.lower()
        
        for event in events:
            # Check attendees
            for attendee in event.get('attendees', []):
                if (attendee_name_lower in attendee.get('displayName', '').lower() or 
                    attendee_name_lower in attendee.get('email', '').lower()):
                    matching_events.append(event)
                    break
            
            # Also check organizer
            organizer = event.get('organizer', {})
            if (attendee_name_lower in organizer.get('displayName', '').lower() or 
                attendee_name_lower in organizer.get('email', '').lower()):
                matching_events.append(event)
        
        return matching_events
    
    def get_meetings_today(self) -> List[Dict[str, Any]]:
        """
        Get all meetings for today
        
        Returns:
            List of today's meetings
        """
        events = self.get_upcoming_events(max_results=20, days_ahead=1)
        today = datetime.utcnow().date()
        
        today_events = []
        for event in events:
            start_time_str = event.get('start', '')
            if start_time_str:
                try:
                    if 'T' in start_time_str:
                        if start_time_str.endswith('Z'):
                            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                        else:
                            start_time = datetime.fromisoformat(start_time_str)
                        if start_time.date() == today:
                            today_events.append(event)
                    else:
                        start_date = datetime.fromisoformat(start_time_str).date()
                        if start_date == today:
                            today_events.append(event)
                except ValueError:
                    continue
        
        return today_events
    
    def format_event_for_voice(self, event: Dict[str, Any]) -> str:
        """
        Format a calendar event for voice response
        
        Args:
            event: Calendar event dictionary
            
        Returns:
            Formatted string for voice output
        """
        summary = event.get('summary', 'Meeting')
        start_time = event.get('start', '')
        attendees = event.get('attendees', [])
        location = event.get('location', '')
        
        # Format start time
        time_str = ""
        if start_time:
            try:
                if 'T' in start_time:
                    if start_time.endswith('Z'):
                        dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    else:
                        dt = datetime.fromisoformat(start_time)
                    time_str = dt.strftime("at %I:%M %p on %B %d")
                else:
                    dt = datetime.fromisoformat(start_time)
                    time_str = dt.strftime("on %B %d")
            except ValueError:
                time_str = "at an unspecified time"
        
        # Format attendees
        attendee_names = [att.get('displayName', '') for att in attendees if att.get('displayName')]
        if len(attendee_names) == 1:
            attendee_str = f"with {attendee_names[0]}"
        elif len(attendee_names) == 2:
            attendee_str = f"with {attendee_names[0]} and {attendee_names[1]}"
        elif len(attendee_names) > 2:
            attendee_str = f"with {', '.join(attendee_names[:-1])}, and {attendee_names[-1]}"
        else:
            attendee_str = ""
        
        # Build the response
        response_parts = [f"You have '{summary}'"]
        if time_str:
            response_parts.append(time_str)
        if attendee_str:
            response_parts.append(attendee_str)
        if location:
            response_parts.append(f"at {location}")
        
        return " ".join(response_parts) + "."


# Global calendar service instance
calendar_service = CalendarService() 