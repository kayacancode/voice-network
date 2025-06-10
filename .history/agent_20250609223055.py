from dotenv import load_dotenv
import os
import asyncio
import json
import aiohttp
from typing import Annotated

from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli, tokenize, tts
from livekit.agents.llm import (
    ChatContext,
    ChatMessage,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, silero

# Import Pinecone directly in the agent
from pinecone import Pinecone
import openai as openai_client

load_dotenv('.env.local')

# Initialize Pinecone and OpenAI clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
openai_api = openai_client.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ContactSearchAgent:
    def __init__(self):
        self.search_cache = {}
    
    async def search_contacts_direct(self, query: str, top_k: int = 10):
        """Search contacts directly through Pinecone without API calls"""
        try:
            print(f"Searching Pinecone directly for: {query}")
            
            # Generate embedding for the search query
            embedding_response = await asyncio.to_thread(
                openai_api.embeddings.create,
                model="text-embedding-3-small",
                input=query
            )
            
            query_embedding = embedding_response.data[0].embedding
            
            # Search in Pinecone directly
            search_response = await asyncio.to_thread(
                index.query,
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                include_values=False
            )
            
            # Transform results
            contacts = []
            for match in search_response.matches or []:
                metadata = match.metadata or {}
                contact = {
                    'id': match.id,
                    'name': metadata.get('name', ''),
                    'title': metadata.get('title', ''),
                    'company': metadata.get('company', ''),
                    'location': metadata.get('location', ''),
                    'industry': metadata.get('industry', ''),
                    'skills': metadata.get('skills', []),
                    'description': metadata.get('description', ''),
                    'score': match.score,
                    'email': metadata.get('email', ''),
                    'linkedin_url': metadata.get('linkedin_url', ''),
                    'instagram_handle': metadata.get('instagram_handle', '')
                }
                contacts.append(contact)
            
            print(f"Found {len(contacts)} contacts with scores: {[c['score'] for c in contacts[:3]]}")
            return contacts
            
        except Exception as e:
            print(f"Error searching Pinecone directly: {e}")
            return []

    def format_contacts_for_response(self, contacts, query):
        """Format contact results for natural language response"""
        if not contacts:
            return f"I couldn't find anyone in your network matching '{query}'. Try a different search term or check if you've uploaded your contacts."

        # Filter for relevant contacts (score > 0.7)
        relevant_contacts = [c for c in contacts if c.get('score', 0) > 0.7]
        
        if not relevant_contacts:
            return f"I found some contacts but none closely match '{query}'. Try a broader search term."

        if len(relevant_contacts) == 1:
            contact = relevant_contacts[0]
            response = f"I found {contact['name']}"
            if contact['title']:
                response += f", who is a {contact['title']}"
            if contact['company']:
                response += f" at {contact['company']}"
            if contact['location']:
                response += f" in {contact['location']}"
            response += ". Would you like more details or want to search for someone else?"
            return response
        
        # Multiple contacts
        response = f"I found {len(relevant_contacts)} people matching '{query}': "
        names = []
        for contact in relevant_contacts[:3]:
            name_part = contact['name']
            if contact['company']:
                name_part += f" from {contact['company']}"
            names.append(name_part)
        
        response += ", ".join(names)
        if len(relevant_contacts) > 3:
            response += f" and {len(relevant_contacts) - 3} others"
        
        response += ". Would you like me to narrow down the search or get more details about someone specific?"
        return response


# Initialize the contact search agent
contact_agent = ContactSearchAgent()


# Define the search function that the AI can call
@agents.llm.ai_callable()
async def search_network_contacts(
    query: Annotated[str, "The search query for finding contacts (e.g., 'software engineers', 'people at Google', 'designers in SF')"]
) -> str:
    """Search through the user's professional network contacts including LinkedIn connections and Instagram followers."""
    
    print(f"AI called search_network_contacts with query: {query}")
    
    # Search contacts directly
    contacts = await contact_agent.search_contacts_direct(query, top_k=15)
    
    # Format response
    response = contact_agent.format_contacts_for_response(contacts, query)
    
    print(f"Returning response: {response[:100]}...")
    return response


async def entrypoint(ctx: JobContext):
    print("Starting LiveKit agent with direct Pinecone integration")
    
    initial_ctx = ChatContext().append(
        role="system",
        text=(
            "You are a helpful AI assistant that specializes in searching professional networks. "
            "You have access to the user's LinkedIn contacts and Instagram followers through the search_network_contacts function. "
            
            "When users ask about finding people (like 'find designers', 'who do I know at Google', 'show me engineers'), "
            "you should use the search_network_contacts function to actually search their network and provide real results. "
            
            "Always be conversational and helpful. When you find contacts, mention their names, titles, and companies naturally. "
            "If you don't find good matches, suggest trying different search terms."
        ),
    )

    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=openai.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
        chat_ctx=initial_ctx,
    )

    # Start the voice assistant
    assistant.start(ctx.room)

    # Send initial greeting
    await assistant.say(
        "Hello! I'm your AI assistant for searching your professional network. "
        "I can help you find people from your LinkedIn contacts and Instagram followers. "
        "Try asking me something like 'find software engineers' or 'who do I know at Google'."
    )

    print("Agent is ready and listening...")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))