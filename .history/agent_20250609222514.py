from dotenv import load_dotenv
import os
import asyncio
import json
import aiohttp

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    noise_cancellation,
)

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

IMPORTANT: When users ask about searching for contacts (like "find designers", "who do I know at Google", "show me engineers", etc.), you should tell them you're searching their database and then actually search it using your search capabilities.

Be conversational and helpful. Always search the actual database when asked and provide real results."""
        )

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

    async def search_contacts_via_api(self, user_input: str):
        """Search contacts using the same API as the frontend"""
        try:
            print(f"Processing user input: {user_input}")
            
            # First, process with LLM to get refined query (same as frontend)
            async with aiohttp.ClientSession() as session:
                llm_payload = {
                    "user_transcript": user_input,
                    "conversation_state": {
                        "prior_queries": [],
                        "prior_results": [],
                        "context": ""
                    }
                }
                
                async with session.post(
                    'http://localhost:3000/api/llm-query',
                    json=llm_payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    llm_result = await response.json()
                
                if not llm_result.get('success'):
                    print("LLM query failed, using original input")
                    refined_query = user_input
                else:
                    refined_query = llm_result.get('refined_query', user_input)
                    print(f"Refined query: {refined_query}")
                
                # Now search with the refined query (same as frontend)
                search_payload = {
                    "query": refined_query,
                    "topK": 20
                }
                
                async with session.post(
                    'http://localhost:3000/api/search-contacts',
                    json=search_payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    search_result = await response.json()
                
                if search_result.get('success'):
                    return search_result.get('results', [])
                else:
                    print("Search API failed")
                    return []
                    
        except Exception as e:
            print(f"Error searching via API: {e}")
            return []

    async def format_contact_response(self, contacts, original_query):
        """Format contact search results into a natural response"""
        if not contacts:
            return f"I couldn't find anyone in your network matching '{original_query}'. You might want to try a different search term, or perhaps you haven't uploaded contacts yet."

        # Filter contacts with reasonable similarity scores
        relevant_contacts = [c for c in contacts if c.get('score', 0) > 0.7]
        
        if not relevant_contacts:
            return f"I couldn't find anyone closely matching '{original_query}'. You might want to try a broader search term."

        if len(relevant_contacts) == 1:
            contact = relevant_contacts[0]
            response = f"I found {contact['name']}"
            if contact['title']:
                response += f", who is a {contact['title']}"
            if contact['company']:
                response += f" at {contact['company']}"
            if contact['location']:
                response += f" in {contact['location']}"
            response += ". Would you like me to search for someone else or get more details?"
        else:
            response = f"I found {len(relevant_contacts)} people in your network for '{original_query}': "
            
            names = []
            for contact in relevant_contacts[:3]:  # Only mention first 3
                name_part = contact['name']
                if contact['title']:
                    name_part += f" who's a {contact['title']}"
                if contact['company']:
                    name_part += f" at {contact['company']}"
                names.append(name_part)
            
            if len(relevant_contacts) <= 3:
                response += ", ".join(names[:-1])
                if len(names) > 1:
                    response += f" and {names[-1]}"
                else:
                    response += names[0]
            else:
                response += ", ".join(names)
                response += f" and {len(relevant_contacts) - 3} others"
            
            response += ". Would you like me to search for something more specific?"

        return response

    async def handle_user_input(self, user_input: str):
        """Process user input and search if it's a contact query"""
        user_lower = user_input.lower()
        
        # Detect search patterns
        search_triggers = [
            'find', 'show me', 'who', 'search', 'look for', 'get me',
            'do i know', 'contacts', 'people', 'anyone', 'someone'
        ]
        
        is_search_query = any(trigger in user_lower for trigger in search_triggers)
        
        if is_search_query:
            # Use the same API as frontend - no stop word removal!
            contacts = await self.search_contacts_via_api(user_input)
            return await self.format_contact_response(contacts, user_input)
        
        return None  # Not a search query


async def entrypoint(ctx: agents.JobContext):
    assistant = ContactSearchAssistant()

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="coral"
        )
    )

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

    await ctx.connect()

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


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))