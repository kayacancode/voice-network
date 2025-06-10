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
            return f"I searched through your network for '{query}', but I couldn't find any matches. Would you like to try a different search term? Or perhaps you haven't uploaded your contacts yet."

        if len(contacts) == 1:
            contact = contacts[0]
            response = f"I found one person in your network: {contact['name']}"
            if contact['title']:
                response += f", who works as a {contact['title']}"
            if contact['company']:
                response += f" at {contact['company']}"
            if contact['location']:
                response += f" in {contact['location']}"
            if contact['industry']:
                response += f" in the {contact['industry']} industry"
            response += ". Would you like to know more about this person or search for someone else?"
        else:
            response = f"I found {len(contacts)} people in your network matching '{query}'. "
            
            # Group contacts by company if possible
            company_groups = {}
            for contact in contacts:
                company = contact['company'] or 'Other'
                if company not in company_groups:
                    company_groups[company] = []
                company_groups[company].append(contact)
            
            # Format the response based on company groups
            if len(company_groups) == 1:
                company = list(company_groups.keys())[0]
                contacts = company_groups[company]
                response += f"They all work at {company}. "
            
            # List the first 3 contacts with details
            names = []
            for contact in contacts[:3]:
                name_part = contact['name']
                if contact['title']:
                    name_part += f", who's a {contact['title']}"
                if contact['company'] and len(company_groups) > 1:
                    name_part += f" at {contact['company']}"
                if contact['location']:
                    name_part += f" in {contact['location']}"
                names.append(name_part)
            
            if len(contacts) <= 3:
                response += "They are: "
                response += ", ".join(names[:-1])
                if len(names) > 1:
                    response += f", and {names[-1]}"
                else:
                    response += names[0]
            else:
                response += "Here are some of them: "
                response += ", ".join(names)
                response += f", and {len(contacts) - 3} others"
            
            response += ". Would you like me to search for something more specific or tell you more about any of these people?"

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