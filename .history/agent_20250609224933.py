from dotenv import load_dotenv
import os
import asyncio
import json
import aiohttp
from pinecone import Pinecone
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    noise_cancellation,
)
import numpy as np

load_dotenv('.env.local')
import openai as openai_client

# Initialize Pinecone and OpenAI
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "ai-network"))
openai_sync = openai_client.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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
        self.conversation_state = {
            "prior_queries": [],
            "current_results": [],
            "search_context": None,
            "active_filters": {
                "locations": [],
                "companies": [],
                "titles": []
            }
        }

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
            query_embedding = embedding_response.data[0].embedding / np.linalg.norm(embedding_response.data[0].embedding)

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

        if len(contacts) == 0:
            return "I found no matches. Try broadening your search terms."
        elif len(contacts) < 3:
            return f"I found {contacts[0]['name']} at {contacts[0]['company']}"
        else:
            return f"Found {len(contacts)} matches including {contacts[0]['name']} and {contacts[1]['name']}"

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
                min_score = max(0.25, 1 - (0.1 * len(query.split())))
                filtered_contacts = [contact for contact in contacts if contact['score'] > min_score]
                return await self.format_contact_response(filtered_contacts, query)
        
        return None  # Not a search query

    async def _is_search_intent(self, text: str) -> bool:
        intent_embed = await self._get_embedding(text)
        example_embeds = [await self._get_embedding(e) for e in self.INTENT_EXAMPLES]
        return max(np.dot(intent_embed, ex_embed) for ex_embed in example_embeds) > 0.65


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