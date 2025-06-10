from dotenv import load_dotenv
import os
import asyncio
import json

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    noise_cancellation,
)
from livekit import rtc

load_dotenv('.env.local')


class ContactSearchAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are an AI assistant that helps users search their professional network contacts. 

Your capabilities:
- Search through LinkedIn contacts and Instagram followers
- Find people by name, title, company, location, skills, or industry
- Provide detailed information about contacts
- Help refine searches and suggest follow-ups

IMPORTANT: When users ask about searching for contacts (like "find designers", "who do I know at Google", "show me engineers", etc.), you should tell them you're searching their database and then coordinate with the frontend to perform the search.

Be conversational and helpful. Always search the actual database when asked and provide real results."""
        )
        self.room = None
        self.search_results = []
        self.current_query = ""
        self.waiting_for_results = False

    def set_room(self, room):
        """Set the room reference for sending data to frontend"""
        self.room = room
        print("Room reference set for agent communication")

    async def generate_reply(
        self,
        *,
        text: str | None = None,
        instructions: str | None = None,
        llm_session=None,
    ) -> str:
        """Override reply generation to handle contact searches"""
        
        # If this is a search request, handle it specially
        if text and llm_session:
            search_response = await self.handle_user_input(text)
            if search_response:
                print(f"Generated search response: {search_response}")
                return search_response
        
        # Otherwise, use normal generation
        return await super().generate_reply(
            text=text,
            instructions=instructions,
            llm_session=llm_session
        )

    async def send_search_request(self, query: str):
        """Send search request to frontend via data channel"""
        if not self.room:
            print("ERROR: No room available for sending search request")
            return False
        
        if not self.room.local_participant:
            print("ERROR: No local participant available")
            return False
        
        try:
            search_data = {
                "type": "search_request",
                "query": query,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            print(f"Sending search request to frontend: {query}")
            
            # Send data to all participants in the room
            await self.room.local_participant.publish_data(
                json.dumps(search_data).encode(),
                destination_identities=None  # Send to all participants
            )
            
            print(f"✅ Successfully sent search request: {query}")
            self.current_query = query
            self.waiting_for_results = True
            return True
            
        except Exception as e:
            print(f"❌ Error sending search request: {e}")
            return False

    async def wait_for_search_results(self, timeout: float = 10.0):
        """Wait for search results from frontend"""
        print(f"Waiting for search results (timeout: {timeout}s)...")
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < timeout:
            if self.search_results:
                results = self.search_results.copy()
                self.search_results = []  # Clear after reading
                self.waiting_for_results = False
                print(f"✅ Received search results: {len(results)} contacts")
                return results
            await asyncio.sleep(0.1)
        
        print("⚠️ Timeout waiting for search results from frontend")
        self.waiting_for_results = False
        return []

    def handle_search_results(self, results):
        """Receive search results from frontend"""
        print(f"📥 Received search results from frontend: {len(results)} contacts")
        for i, contact in enumerate(results[:3]):  # Log first 3
            name = contact.get('name', 'Unknown')
            title = contact.get('title', '')
            company = contact.get('company', '')
            print(f"  {i+1}. {name} {f'- {title}' if title else ''} {f'at {company}' if company else ''}")
        
        self.search_results = results

    async def format_contact_response(self, contacts, query):
        """Format contact search results into a natural response"""
        if not contacts:
            return f"I searched your network for '{query}' but couldn't find any matching contacts. You might want to try a different search term, or perhaps you haven't uploaded contacts yet."

        print(f"Formatting response for {len(contacts)} contacts")

        if len(contacts) == 1:
            contact = contacts[0]
            response = f"I found {contact.get('name', 'someone')}"
            if contact.get('title'):
                response += f", who is a {contact['title']}"
            if contact.get('company'):
                response += f" at {contact['company']}"
            if contact.get('location'):
                response += f" in {contact['location']}"
            response += ". Would you like me to search for someone else or get more details?"
        else:
            response = f"I found {len(contacts)} people in your network for '{query}': "
            
            names = []
            for contact in contacts[:3]:  # Only mention first 3
                name_part = contact.get('name', 'Unknown')
                if contact.get('title'):
                    name_part += f" who's a {contact['title']}"
                if contact.get('company'):
                    name_part += f" at {contact['company']}"
                names.append(name_part)
            
            if len(contacts) <= 3:
                if len(names) > 1:
                    response += ", ".join(names[:-1]) + f" and {names[-1]}"
                else:
                    response += names[0]
            else:
                response += ", ".join(names)
                response += f" and {len(contacts) - 3} others"
            
            response += ". Would you like me to search for something more specific?"

        print(f"Generated response: {response[:100]}...")
        return response

    async def handle_user_input(self, user_input: str):
        """Process user input and coordinate search with frontend"""
        print(f"Processing user input: {user_input}")
        user_lower = user_input.lower()
        
        # Detect search patterns
        search_triggers = [
            'find', 'show me', 'who', 'search', 'look for', 'get me',
            'do i know', 'contacts', 'people', 'anyone', 'someone'
        ]
        
        is_search_query = any(trigger in user_lower for trigger in search_triggers)
        print(f"Is search query: {is_search_query}")
        
        if is_search_query:
            # Extract search terms - remove common words
            stop_words = {'find', 'show', 'me', 'who', 'are', 'the', 'do', 'i', 'know', 'any', 'people', 'someone', 'anyone', 'contacts', 'from', 'at', 'in', 'my', 'network'}
            words = user_input.lower().split()
            search_terms = [word for word in words if word not in stop_words and len(word) > 2]
            
            if search_terms:
                query = ' '.join(search_terms)
                print(f"Extracted search query: {query}")
                
                # Send search request to frontend
                success = await self.send_search_request(query)
                if not success:
                    return "I'm having trouble connecting to the search system. Please try again."
                
                # Wait for results from frontend
                contacts = await self.wait_for_search_results()
                
                # Format and return response
                return await self.format_contact_response(contacts, query)
        
        print("Not a search query, returning None")
        return None  # Not a search query


async def entrypoint(ctx: agents.JobContext):
    print("🚀 Starting Contact Search Assistant")
    assistant = ContactSearchAssistant()
    assistant.set_room(ctx.room)

    # Listen for search results from frontend
    async def on_data_received(data: rtc.DataPacket):
        try:
            message = json.loads(data.data.decode())
            print(f"📨 Received data packet: {message.get('type', 'unknown')}")
            
            if message.get("type") == "search_results":
                print(f"🔍 Processing search results for query: {message.get('query', 'unknown')}")
                assistant.handle_search_results(message.get("results", []))
            else:
                print(f"ℹ️ Ignoring unknown message type: {message.get('type')}")
                
        except Exception as e:
            print(f"❌ Error processing data packet: {e}")

    print("📡 Setting up data channel listener")
    ctx.room.on("data_received", on_data_received)

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="coral"
        )
    )

    print("🎯 Starting agent session")
    await session.start(
        room=ctx.room,
        agent=assistant,
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # - If self-hosting, omit this parameter
            # - For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    print("🔌 Connecting to room")
    await ctx.connect()

    print("👋 Sending initial greeting")
    await session.generate_reply(
        instructions="""Hello! I'm your AI assistant for searching your professional network. 

I have access to your LinkedIn contacts and Instagram followers. I can help you find people by name, job title, company, location, or skills.

For example, you can say:
- "Find designers"
- "Who do I know at Google?" 
- "Show me software engineers"
- "People in San Francisco"

When you ask me to search for contacts, I'll look through your actual network and tell you who I find. What would you like to search for?"""
    )

    print("✅ Agent is ready and listening")


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))