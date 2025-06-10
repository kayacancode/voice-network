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

IMPORTANT: 
- Always use the actual search results from the database
- Never make up or fabricate information
- If no results are found, simply say "No information found"
- Only mention contacts that are in the actual search results"""
        )
        self.last_search_results = None

    async def generate_reply(
        self,
        *,
        text: str | None = None,
        instructions: str | None = None,
        llm_session=None,
    ) -> str:
        """Override reply generation to handle contact searches"""
        
        # Always search for any user input
        if text and llm_session:
            search_response = await self.handle_user_input(text)
            if search_response:
                print(f"Generated search response: {search_response}")
                return search_response
        
        # If no search response, use default generation
        return await super().generate_reply(
            text=text,
            instructions=instructions,
            llm_session=llm_session
        )

    async def format_contact_response(self, contacts, query):
        """Format contact search results into a natural response"""
        if not contacts:
            return f"No information found for '{query}'. You might want to try a different search term, or perhaps you haven't uploaded contacts yet."

        # Format the response based on actual contacts found
        response = f"I found {len(contacts)} people in your network for '{query}': "
        
        # List each contact with their details
        contact_descriptions = []
        for contact in contacts:
            desc = contact['name']
            if contact['title']:
                desc += f", who is a {contact['title']}"
            if contact['company']:
                desc += f" at {contact['company']}"
            if contact['location']:
                desc += f" in {contact['location']}"
            contact_descriptions.append(desc)

        # Join the descriptions
        if len(contact_descriptions) == 1:
            response = f"I found {contact_descriptions[0]}."
        else:
            response += ", ".join(contact_descriptions[:-1])
            if len(contact_descriptions) > 1:
                response += f" and {contact_descriptions[-1]}"

        response += ". Would you like me to search for something more specific?"
        return response

    async def handle_user_input(self, user_input: str):
        """Process user input and always search"""
        # Extract search terms - remove common words
        stop_words = {'find', 'show', 'me', 'who', 'are', 'the', 'do', 'i', 'know', 'any', 'people', 'someone', 'anyone', 'contacts', 'from', 'at', 'in', 'my', 'network'}
        words = user_input.lower().split()
        search_terms = [word for word in words if word not in stop_words and len(word) > 2]
        
        if search_terms:
            query = ' '.join(search_terms)
            # Use the search results from the frontend
            if self.last_search_results:
                return await self.format_contact_response(self.last_search_results, query)
            else:
                return "I'm searching your network. Please wait for the results to appear."
        
        return "I didn't catch that. Could you please try again with a different search term?"

    def update_search_results(self, results):
        """Update the last search results"""
        self.last_search_results = results


async def entrypoint(ctx: agents.JobContext):
    assistant = ContactSearchAssistant()

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="coral"
        )
    )

    # Handle data messages from the frontend
    def handle_data(data: bytes):
        try:
            message = json.loads(data.decode())
            if message.get('type') == 'search_results':
                # Update search results synchronously
                assistant.last_search_results = message.get('results', [])
                print(f"Updated search results with {len(assistant.last_search_results)} contacts")
        except Exception as e:
            print(f"Error handling data message: {e}")

    # Register data handler
    ctx.room.on("data_received", handle_data)

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