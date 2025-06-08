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

When users ask about contacts, always search the database and provide specific, helpful results.
Be conversational and friendly while being informative about their network."""
        )

    async def search_contacts(self, query: str, top_k: int = 5):
        """Search contacts in Pinecone database"""
        try:
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

            return contacts
        except Exception as e:
            print(f"Error searching contacts: {e}")
            return []

    async def format_contact_response(self, contacts, query):
        """Format contact search results into a natural response"""
        if not contacts:
            return f"I couldn't find anyone in your network matching '{query}'. Try a different search term or description."

        response = f"I found {len(contacts)} people in your network matching '{query}':\n\n"
        
        for i, contact in enumerate(contacts, 1):
            response += f"{i}. {contact['name']}"
            if contact['title']:
                response += f" - {contact['title']}"
            if contact['company']:
                response += f" at {contact['company']}"
            if contact['location']:
                response += f" in {contact['location']}"
            response += "\n"

        response += "\nWould you like me to search for something more specific or get details about any of these contacts?"
        return response


async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="coral"
        )
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # - If self-hosting, omit this parameter
            # - For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()

    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))