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
from pinecone import Pinecone
import openai as openai_client

load_dotenv('.env.local')

# Initialize Pinecone and OpenAI
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "ai-network"))
openai_sync = openai_client.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class LinkedInNetworkAgent:
    """Handles LinkedIn-specific network search operations"""
    
    def __init__(self, api_base_url="http://localhost:3000"):
        self.api_base_url = api_base_url
        self.linkedin_api_url = f"{api_base_url}/api/linkedin-search"
    
    async def search_linkedin_network(self, query: str, limit: int = 10, include_second_degree: bool = False):
        """Search LinkedIn network using the new API"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "action": "search_network",
                    "query": query,
                    "limit": limit,
                    "includeSecondDegree": include_second_degree
                }
                
                async with session.post(self.linkedin_api_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get("success"):
                            return data.get("results", [])
                    else:
                        print(f"LinkedIn API error: {response.status}")
                        return []
        except Exception as e:
            print(f"Error searching LinkedIn network: {e}")
            return []
    
    async def fetch_linkedin_connections(self, max_connections: int = 500, include_second_degree: bool = False):
        """Fetch LinkedIn connections and store them"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "action": "fetch_connections",
                    "maxConnections": max_connections,
                    "includeSecondDegree": include_second_degree
                }
                
                async with session.post(self.linkedin_api_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("success", False), data.get("message", "")
                    else:
                        return False, f"API error: {response.status}"
        except Exception as e:
            print(f"Error fetching LinkedIn connections: {e}")
            return False, str(e)
    
    async def get_network_stats(self):
        """Get LinkedIn network statistics"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {"action": "get_stats"}
                
                async with session.post(self.linkedin_api_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get("success"):
                            return data.get("stats", {})
                    return {}
        except Exception as e:
            print(f"Error getting network stats: {e}")
            return {}
    
    def format_linkedin_results(self, results, query):
        """Format LinkedIn search results for voice response"""
        if not results:
            return f"I didn't find any LinkedIn connections matching '{query}'. You might want to try a broader search or make sure your LinkedIn data has been imported."
        
        response = f"I found {len(results)} LinkedIn connections"
        if len(results) == 1:
            person = results[0]
            response = f"I found {person['name']}"
            if person.get('title'):
                response += f", who is {person['title']}"
            if person.get('company'):
                response += f" at {person['company']}"
            if person.get('location'):
                response += f" in {person['location']}"
            
            connection_type = person.get('connectionType', 'first-degree')
            if connection_type == 'second-degree':
                response += ". This is a second-degree connection"
            
            response += f". The match score is {person.get('score', 0):.2f}."
        else:
            response += f" for '{query}': "
            
            for i, person in enumerate(results[:3], 1):  # Top 3 results for voice
                response += f"{i}. {person['name']}"
                if person.get('title'):
                    response += f", {person['title']}"
                if person.get('company'):
                    response += f" at {person['company']}"
                if person.get('location'):
                    response += f" in {person['location']}"
                response += f" (match: {person.get('score', 0):.2f})"
                if i < min(3, len(results)):
                    response += ". "
            
            if len(results) > 3:
                response += f" And {len(results) - 3} more results."
        
        return response


class ContactSearchAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are an AI assistant that helps users search their professional network contacts. 

Your capabilities:
- Search through LinkedIn connections (first and second degree)
- Search through general contact database (LinkedIn contacts and Instagram followers)
- Find people by name, title, company, location, skills, or industry
- Fetch new LinkedIn connections automatically
- Provide network statistics and insights
- Help refine searches and suggest follow-ups

IMPORTANT: When users ask about searching for contacts, determine if they want:
1. LinkedIn-specific search (when they mention "LinkedIn", "professional network", "connections")
2. General contact search (for broader queries)
3. Fetching new data (when they ask to "update", "fetch", or "get my connections")

Always search the actual database when asked and provide real results. Be conversational and helpful."""
        )
        
        # Initialize LinkedIn network agent
        self.linkedin_agent = LinkedInNetworkAgent()

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

    async def search_contacts(self, query: str, top_k: int = 5):
        """Search contacts in Pinecone database"""
        try:
            print(f"Searching for: {query}")
            
            # Generate embedding for the query
            embedding_response = openai_sync.embeddings.create(
                model="text-embedding-3-small",
                input=query
            )
            query_embedding = embedding_response.data[0].embedding

            # Search in Pinecone
            search_results = index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )

            contacts = []
            for match in search_results.matches:
                if match.score > 0.7:  # Only include relevant matches
                    metadata = match.metadata
                    contact = {
                        "name": metadata.get("name", ""),
                        "title": metadata.get("title", ""),
                        "company": metadata.get("company", ""),
                        "location": metadata.get("location", ""),
                        "industry": metadata.get("industry", ""),
                        "score": round(match.score, 3)
                    }
                    contacts.append(contact)

            print(f"Found {len(contacts)} relevant contacts")
            return contacts
        except Exception as e:
            print(f"Error searching contacts: {e}")
            return []

    async def format_contact_response(self, contacts, query):
        """Format contact search results into a natural response"""
        if not contacts:
            return f"I couldn't find anyone in your network matching '{query}'. You might want to try a different search term, or perhaps you haven't uploaded contacts yet."

        if len(contacts) == 1:
            contact = contacts[0]
            response = f"I found {contact['name']}"
            if contact['title']:
                response += f", who is a {contact['title']}"
            if contact['company']:
                response += f" at {contact['company']}"
            if contact['location']:
                response += f" in {contact['location']}"
            response += ". Would you like me to search for someone else or get more details?"
        else:
            response = f"I found {len(contacts)} people in your network for '{query}': "
            
            names = []
            for contact in contacts[:3]:  # Only mention first 3
                name_part = contact['name']
                if contact['title']:
                    name_part += f" who's a {contact['title']}"
                if contact['company']:
                    name_part += f" at {contact['company']}"
                names.append(name_part)
            
            if len(contacts) <= 3:
                response += ", ".join(names[:-1])
                if len(names) > 1:
                    response += f" and {names[-1]}"
                else:
                    response += names[0]
            else:
                response += ", ".join(names)
                response += f" and {len(contacts) - 3} others"
            
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
            # Extract search terms - remove common words
            stop_words = {'find', 'show', 'me', 'who', 'are', 'the', 'do', 'i', 'know', 'any', 'people', 'someone', 'anyone', 'contacts', 'from', 'at', 'in', 'my', 'network'}
            words = user_input.lower().split()
            search_terms = [word for word in words if word not in stop_words and len(word) > 2]
            
            if search_terms:
                query = ' '.join(search_terms)
                contacts = await self.search_contacts(query)
                return await self.format_contact_response(contacts, query)
        
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