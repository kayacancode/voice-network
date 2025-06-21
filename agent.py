#!/usr/bin/env python3
import os
import asyncio
import re
import json
import aiohttp
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    Agent,
    AgentSession,
    RoomInputOptions,
    function_tool,
    RunContext,
)
from livekit.plugins import openai as lk_openai, noise_cancellation
from pinecone import Pinecone
import openai as openai_client

# Import the calendar service
from calendar_service import calendar_service

# Load your .env.local with PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY
load_dotenv('.env.local')


class ContactSearchAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are an AI assistant that helps users search their professional network "
                "and capture voice-driven memories about people they meet. "
                "You can search contacts, save memories about people, and recall stored memories."
            )
        )
        # Initialize Pinecone & OpenAI clients
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index = self.pc.Index(
            os.getenv("PINECONE_INDEX_NAME", "ai-network")
        )
        self.openai_sync = openai_client.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    def _preprocess_query(self, query: str) -> list[str]:
        """Generate multiple variations of the query to handle speech transcription errors."""
        variations = []
        
        # Original query
        variations.append(query.strip())
        
        # Common speech-to-text corrections
        corrections = {
            # Common transcription errors for tech roles
            'engineergs': 'engineers',
            'engineerg': 'engineer',
            'enginners': 'engineers',
            'enginer': 'engineer',
            'developpers': 'developers',
            'develper': 'developer',
            'mangager': 'manager',
            'mangers': 'managers',
            'desiner': 'designer',
            'desingers': 'designers',
            'anlyst': 'analyst',
            'anlysts': 'analysts',
            'scrum master': 'scrum master',
            'scrummaster': 'scrum master',
            'devops': 'devops engineer',
            'datascientist': 'data scientist',
            'prodcut': 'product',
            'frontent': 'frontend',
            'bakend': 'backend',
            'fullstack': 'full stack',
        }
        
        # Apply corrections
        corrected_query = query.lower()
        for wrong, right in corrections.items():
            if wrong in corrected_query:
                corrected_query = corrected_query.replace(wrong, right)
                variations.append(corrected_query)
        
        # Add singular/plural variations
        words = query.split()
        for i, word in enumerate(words):
            word_lower = word.lower()
            new_words = words.copy()
            
            # Add plural form
            if not word_lower.endswith('s') and len(word_lower) > 3:
                new_words[i] = word + 's'
                variations.append(' '.join(new_words))
            
            # Add singular form
            if word_lower.endswith('s') and len(word_lower) > 4:
                new_words[i] = word[:-1]
                variations.append(' '.join(new_words))
        
        # Add expanded terms for common roles
        role_expansions = {
            'engineer': ['engineer', 'engineering', 'software engineer', 'developer'],
            'engineers': ['engineers', 'engineering', 'software engineers', 'developers'],
            'dev': ['developer', 'engineer', 'software engineer'],
            'devs': ['developers', 'engineers', 'software engineers'],
            'designer': ['designer', 'design', 'ux designer', 'ui designer', 'graphic designer'],
            'designers': ['designers', 'design', 'ux designers', 'ui designers', 'graphic designers'],
            'manager': ['manager', 'management', 'project manager', 'product manager'],
            'managers': ['managers', 'management', 'project managers', 'product managers'],
            'pm': ['product manager', 'project manager', 'manager'],
            'qa': ['quality assurance', 'tester', 'qa engineer'],
            'sales': ['sales', 'sales representative', 'account executive'],
            'marketing': ['marketing', 'digital marketing', 'marketing specialist'],
        }
        
        # Check if query contains expandable terms
        query_lower = query.lower()
        for term, expansions in role_expansions.items():
            if term in query_lower:
                for expansion in expansions:
                    expanded = query_lower.replace(term, expansion)
                    variations.append(expanded)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_variations = []
        for variation in variations:
            if variation.lower() not in seen:
                seen.add(variation.lower())
                unique_variations.append(variation)
        
        return unique_variations[:5]  # Limit to 5 variations to avoid too many API calls

    async def _search_contacts(self, query: str, top_k: int = 5):
        """Embed the query and retrieve matches from Pinecone with fuzzy search."""
        try:
            # Get multiple variations of the query
            query_variations = self._preprocess_query(query)
            
            all_contacts = {}  # Use dict to deduplicate by name
            best_query = query  # Track which query variation worked best
            
            # Try each query variation
            for variation in query_variations:
                try:
                    emb_resp = self.openai_sync.embeddings.create(
                        model="text-embedding-3-small", input=variation
                    )
                    q_emb = emb_resp.data[0].embedding

                    pc_resp = self.index.query(
                        vector=q_emb, top_k=top_k * 2, include_metadata=True  # Get more results to have options
                    )

                    # Process results with lower threshold for fuzzy matching
                    for match in pc_resp.matches:
                        if match.score > 0.25:  # Lower threshold than before
                            md = match.metadata or {}
                            name = md.get("name", "")
                            
                            # Skip if we already have this contact with a better score
                            if name in all_contacts and all_contacts[name]["score"] >= match.score:
                                continue
                                
                            contact = {
                                "name":     name,
                                "title":    md.get("title", ""),
                                "company":  md.get("company", ""),
                                "location": md.get("location", ""),
                                "industry": md.get("industry", ""),
                                "score":    round(match.score, 3),
                                "query_used": variation
                            }
                            all_contacts[name] = contact
                            
                            # Track the best performing query
                            if match.score > 0.4 and variation != query:
                                best_query = variation

                except Exception as variation_error:
                    print(f"Error searching with variation '{variation}':", variation_error)
                    continue

            # Convert back to list and sort by score
            contacts = list(all_contacts.values())
            contacts.sort(key=lambda x: x["score"], reverse=True)
            
            # Log the query that worked if different from original
            if best_query != query and contacts:
                print(f"Original query: '{query}' -> Best match with: '{best_query}'")
            
            return contacts[:top_k]

        except Exception as e:
            print("Error searching Pinecone:", e)
            return []

    async def _format_contact_response(self, contacts, query: str) -> str:
        """Turn a list of contacts into a friendly, conversational string."""
        if not contacts:
            # Suggest alternatives for common transcription errors
            suggestions = []
            query_lower = query.lower()
            
            # Common corrections to suggest
            if 'engineer' in query_lower:
                suggestions.extend(['engineers', 'developers', 'software engineers'])
            elif 'design' in query_lower:
                suggestions.extend(['designers', 'UX designers', 'UI designers'])
            elif 'manager' in query_lower or 'manag' in query_lower:
                suggestions.extend(['managers', 'product managers', 'project managers'])
            elif 'dev' in query_lower:
                suggestions.extend(['developers', 'engineers', 'software developers'])
            
            response = f"I searched for '{query}' but found no matches. "
            if suggestions:
                response += f"You might try searching for: {', '.join(suggestions[:3])}."
            else:
                response += "Would you like to try a different term?"
            return response

        if len(contacts) == 1:
            c = contacts[0]
            parts = [c["name"]]
            if c["title"]:
                parts.append(f"a {c['title']}")
            if c["company"]:
                parts.append(f"at {c['company']}")
            if c["location"]:
                parts.append(f"in {c['location']}")
            if c["industry"]:
                parts.append(f"in the {c['industry']} industry")
            return "I found " + " ".join(parts) + "."

        # multiple contacts
        resp = f"I found {len(contacts)} people matching '{query}'. "
        # group by company
        by_company = {}
        for c in contacts:
            comp = c["company"] or "Other"
            by_company.setdefault(comp, []).append(c)

        if len(by_company) == 1:
            comp = next(iter(by_company))
            resp += f"They all work at {comp}. "

        # list up to 3
        snippets = []
        for c in contacts[:3]:
            snip = c["name"]
            if c["title"]:
                snip += f", {c['title']}"
            if c["company"] and len(by_company) > 1:
                snip += f" at {c['company']}"
            snippets.append(snip)

        resp += "Here are a few: " + ", ".join(snippets)
        if len(contacts) > 3:
            resp += f", and {len(contacts)-3} more."
        return resp

    async def _capture_memory(self, text: str) -> dict:
        """Capture a memory about a person using the API endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:3000/api/capture-memory',
                    json={'text': text, 'userId': 'voice-user'},
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    result = await response.json()
                    return result
        except Exception as e:
            print(f"Error capturing memory: {e}")
            return {'success': False, 'error': str(e)}

    async def _recall_memory(self, query: str) -> dict:
        """Recall memories using the API endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:3000/api/recall-memory',
                    json={'query': query, 'userId': 'voice-user'},
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    result = await response.json()
                    return result
        except Exception as e:
            print(f"Error recalling memory: {e}")
            return {'success': False, 'error': str(e)}

    @function_tool(
        name="search_contacts",
        description=(
            "Search your network for people matching the query; "
            "returns a conversational summary."
        )
    )
    async def _search_contacts_tool(
        self, context: RunContext, query: str
    ) -> str:
        contacts = await self._search_contacts(query)
        return await self._format_contact_response(contacts, query)

    @function_tool(
        name="save_memory",
        description=(
            "Save a memory about a person you met or learned about. "
            "Use this when the user mentions meeting someone or learning facts about them. "
            "For example: 'I met Sarah today, she works at Google as a software engineer.'"
        )
    )
    async def _save_memory_tool(
        self, context: RunContext, memory_text: str
    ) -> str:
        result = await self._capture_memory(memory_text)
        
        if result.get('success'):
            person = result.get('person', 'someone')
            details = result.get('details', 'information')
            return f"Got it—saved that {person} {details}."
        else:
            if result.get('confidence', 0) < 0.7:
                return "I couldn't find clear information about a specific person in what you said. Could you be more specific about who and what you learned about them?"
            else:
                return "I had trouble saving that memory. Could you try rephrasing it?"

    @function_tool(
        name="recall_memory",
        description=(
            "Recall stored memories about people. "
            "Use this when the user asks questions like 'Where does Sarah work?' or 'What do I know about John?'"
        )
    )
    async def _recall_memory_tool(
        self, context: RunContext, query: str
    ) -> str:
        result = await self._recall_memory(query)
        
        if result.get('success'):
            return result.get('message', 'I found that information.')
        else:
            return result.get('message', "I don't have any memories that match your query.")

    @function_tool(
        name="get_calendar_briefing",
        description=(
            "Get briefing information about your next meeting or a specific person. "
            "Use this when the user asks 'Who am I meeting next?', 'What's my next meeting?', "
            "or 'Brief me on [person's name]'. This provides context, background, and talking points."
        )
    )
    async def _get_calendar_briefing_tool(
        self, context: RunContext, query: str = ""
    ) -> str:
        # For now, redirect calendar briefing to the basic calendar functions since the briefing API uses mock data
        if "next meeting" in query.lower() or "who am i meeting" in query.lower():
            return await self._find_next_meeting_tool(context)
        elif "today" in query.lower() or "schedule" in query.lower():
            return await self._get_todays_schedule_tool(context)
        elif "coming up" in query.lower() or "upcoming" in query.lower():
            return await self._get_upcoming_events_tool(context)
        else:
            # For person-specific briefing, use the basic calendar search for now
            return "Calendar briefing is now using your real Google Calendar data. Try asking 'What's my next meeting?' or 'What's my schedule today?' to see your actual calendar events."

    @function_tool(
        name="find_next_meeting",
        description=(
            "Find your next upcoming meeting. "
            "Use this when the user asks 'Who am I meeting with next?', 'What's my next meeting?', "
            "or 'When is my next meeting?'"
        )
    )
    async def _find_next_meeting_tool(
        self, context: RunContext
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        if not events:
                            return "You don't have any upcoming meetings scheduled."
                        
                        # Find the next meeting (first event since they're ordered by time)
                        next_meeting = events[0]
                        
                        # Format for voice response
                        summary = next_meeting.get('summary', 'Meeting')
                        start_time = next_meeting.get('start', '')
                        attendees = next_meeting.get('attendees', [])
                        location = next_meeting.get('location', '')
                        
                        response_parts = [f"Your next meeting is '{summary}'"]
                        if start_time:
                            response_parts.append(f"starting {start_time}")
                        if attendees:
                            attendee_names = [att.get('displayName', att.get('email', '')) for att in attendees[:3]]
                            if attendee_names:
                                response_parts.append(f"with {', '.join(attendee_names)}")
                        if location:
                            response_parts.append(f"at {location}")
                        
                        return " ".join(response_parts) + "."
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
                        
        except Exception as e:
            print(f"Error finding next meeting: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."

    @function_tool(
        name="get_todays_schedule",
        description=(
            "Get all meetings scheduled for today. "
            "Use this when the user asks 'What's my schedule today?', 'What meetings do I have today?', "
            "or 'Show me today's meetings'"
        )
    )
    async def _get_todays_schedule_tool(
        self, context: RunContext
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        if not events:
                            return "You don't have any meetings scheduled for today."
                        
                        # Filter for today's events
                        from datetime import datetime, date
                        today = date.today()
                        today_events = []
                        
                        for event in events:
                            start_time = event.get('start', '')
                            if start_time:
                                try:
                                    if 'T' in start_time:
                                        event_date = datetime.fromisoformat(start_time.replace('Z', '+00:00')).date()
                                    else:
                                        event_date = datetime.fromisoformat(start_time).date()
                                    
                                    if event_date == today:
                                        today_events.append(event)
                                except:
                                    continue
                        
                        if not today_events:
                            return "You don't have any meetings scheduled for today."
                        
                        if len(today_events) == 1:
                            event = today_events[0]
                            return f"You have one meeting today: '{event.get('summary', 'Meeting')}' with {', '.join([att.get('displayName', att.get('email', '')) for att in event.get('attendees', [])[:3]])}"
                        
                        response = f"You have {len(today_events)} meetings today. "
                        for i, event in enumerate(today_events[:3], 1):
                            summary = event.get('summary', 'Meeting')
                            attendees = event.get('attendees', [])
                            attendee_names = [att.get('displayName', att.get('email', '')) for att in attendees[:2]]
                            attendee_str = f" with {', '.join(attendee_names)}" if attendee_names else ""
                            response += f"{i}. '{summary}'{attendee_str}. "
                        
                        if len(today_events) > 3:
                            response += f"And {len(today_events) - 3} more meetings."
                        
                        return response
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
            
        except Exception as e:
            print(f"Error getting today's schedule: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."

    @function_tool(
        name="search_meetings_by_person",
        description=(
            "Search for meetings with a specific person. "
            "Use this when the user asks 'When am I meeting with John?', 'Do I have meetings with Sarah?', "
            "or 'Find my meetings with [person name]'"
        )
    )
    async def _search_meetings_by_person_tool(
        self, context: RunContext, person_name: str
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        # Filter events by person name
                        matching_events = []
                        person_name_lower = person_name.lower()
                        
                        for event in events:
                            # Check attendees and organizer
                            attendees = event.get('attendees', [])
                            for attendee in attendees:
                                display_name = attendee.get('displayName', '').lower()
                                email = attendee.get('email', '').lower()
                                if person_name_lower in display_name or person_name_lower in email:
                                    matching_events.append(event)
                                    break
                        
                        if not matching_events:
                            return f"I couldn't find any upcoming meetings with {person_name}."
                        
                        if len(matching_events) == 1:
                            event = matching_events[0]
                            summary = event.get('summary', 'Meeting')
                            start_time = event.get('start', '')
                            return f"I found one meeting with {person_name}: '{summary}' at {start_time}"
                        
                        response = f"I found {len(matching_events)} meetings with {person_name}. "
                        for i, event in enumerate(matching_events[:2], 1):  # Limit to first 2 for voice
                            summary = event.get('summary', 'Meeting')
                            start_time = event.get('start', '')
                            response += f"{i}. '{summary}' at {start_time}. "
                        
                        if len(matching_events) > 2:
                            response += f"And {len(matching_events) - 2} more meetings."
                        
                        return response
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
            
        except Exception as e:
            print(f"Error searching meetings by person: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."

    @function_tool(
        name="get_upcoming_events",
        description=(
            "Get a summary of upcoming calendar events. "
            "Use this when the user asks 'What's coming up?', 'Show me my upcoming meetings', "
            "or 'What do I have this week?'"
        )
    )
    async def _get_upcoming_events_tool(
        self, context: RunContext, days_ahead: int = 7
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        if not events:
                            return f"You don't have any meetings scheduled for the next {days_ahead} days."
                        
                        if len(events) == 1:
                            event = events[0]
                            summary = event.get('summary', 'Meeting')
                            attendees = event.get('attendees', [])
                            attendee_names = [att.get('displayName', att.get('email', '')) for att in attendees[:2]]
                            attendee_str = f" with {', '.join(attendee_names)}" if attendee_names else ""
                            return f"You have one upcoming meeting: '{summary}'{attendee_str}"
                        
                        response = f"You have {len(events)} meetings coming up. "
                        for i, event in enumerate(events[:3], 1):  # Limit to first 3 for voice
                            summary = event.get('summary', 'Meeting')
                            attendees = event.get('attendees', [])
                            attendee_names = [att.get('displayName', att.get('email', '')) for att in attendees[:2]]
                            attendee_str = f" with {', '.join(attendee_names)}" if attendee_names else ""
                            response += f"{i}. '{summary}'{attendee_str}. "
                        
                        if len(events) > 3:
                            response += f"And {len(events) - 3} more meetings."
                        
                        return response
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
            
        except Exception as e:
            print(f"Error getting upcoming events: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."


async def entrypoint(ctx: agents.JobContext):
    assistant = ContactSearchAssistant()

    session = AgentSession(
        llm=lk_openai.realtime.RealtimeModel(voice="coral")
    )

    await session.start(
        room=ctx.room,
        agent=assistant,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC()
        ),
    )

    await ctx.connect()

    # Kick things off with a greeting
    await session.generate_reply(
        instructions=(
            "Hi! I'm QuickBrief, your voice AI assistant for professional networking and calendar management. "
            "I can help you search your network, manage your calendar, get meeting briefings, and capture memories. "
            "Try saying: 'Who am I meeting next?', 'What's my schedule today?', 'Find designers at Google', "
            "'When am I meeting with John?', 'I met Sarah today', or 'Brief me on Sarah Chen' for instant context."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
