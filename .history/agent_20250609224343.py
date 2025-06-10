from dotenv import load_dotenv
import os
import asyncio
import json
import numpy as np

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
        self.conversation_state = Dict[str,Any] = {
            "prior_queries": [],
            "current_results": [],
            "search_context": None
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

    async def search_contacts(self, query: str, top_k: int = 10):  # Increased default top_k
        try:
            # Enhanced query preprocessing
            processed_query = f"{query} professional network contact search"
            
            # Consistent embedding generation
            embedding_response = openai_sync.embeddings.create(
                model="text-embedding-3-small",
                input=processed_query
            )
            query_embedding = embedding_response.data[0].embedding
            
            # Normalize vector
            query_embedding = np.array(query_embedding)
            query_embedding /= np.linalg.norm(query_embedding)
            
            # Search with metadata filter
            search_results = index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                include_metadata=True,
                filter={"type": {"$eq": "contact"}}  # Ensure consistent filtering
            )

            # Dynamic score threshold
            min_score = 0.35  # Reduced from 0.7
            contacts = [
                {
                    **match.metadata,
                    "score": round(match.score, 3)
                }
                for match in search_results.matches
                if match.score >= min_score
            ]
            
            # Update conversation state
            self.conversation_state["current_results"] = contacts
            self.conversation_state["prior_queries"].append(query)
            
            return contacts
        except Exception as e:
            print(f"Search error: {str(e)}")
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
            """Improved intent detection"""
            # Enhanced search trigger using semantic similarity
            if await self._is_search_intent(user_input):
                search_terms = self._extract_search_terms(user_input)
                contacts = await self.search_contacts(search_terms)
                return await self.format_contact_response(contacts, search_terms)
            return None

    async def _is_search_intent(self, text: str) -> bool:
        """Embedding-based intent classification"""
        INTENT_EXAMPLES = [
            "find contacts in my network",
            "search for professionals",
            "who do I know at",
            "show me people working as"
        ]
        
        text_embed = await self._get_embedding(text)
        example_embeds = [await self._get_embedding(e) for e in INTENT_EXAMPLES]
        
        similarities = [
            np.dot(text_embed, ex_embed) 
            for ex_embed in example_embeds
        ]
        return max(similarities) > 0.65

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