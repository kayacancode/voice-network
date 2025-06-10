#!/usr/bin/env python3
import os
import asyncio
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

# Load your .env.local with PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY
load_dotenv('.env.local')


class ContactSearchAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are an AI assistant that helps users search their professional network."
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

    async def _search_contacts(self, query: str, top_k: int = 5):
        """Embed the query and retrieve matches from Pinecone."""
        try:
            emb_resp = self.openai_sync.embeddings.create(
                model="text-embedding-3-small", input=query
            )
            q_emb = emb_resp.data[0].embedding

            pc_resp = self.index.query(
                vector=q_emb, top_k=top_k, include_metadata=True
            )

            contacts = []
            for match in pc_resp.matches:
                if match.score > 0.7:
                    md = match.metadata or {}
                    contacts.append({
                        "name":     md.get("name", ""),
                        "title":    md.get("title", ""),
                        "company":  md.get("company", ""),
                        "location": md.get("location", ""),
                        "industry": md.get("industry", ""),
                        "score":    round(match.score, 3),
                    })
            return contacts

        except Exception as e:
            print("Error searching Pinecone:", e)
            return []

    async def _format_contact_response(self, contacts, query: str) -> str:
        """Turn a list of contacts into a friendly, conversational string."""
        if not contacts:
            return (
                f"I searched for '{query}' but found no matches. "
                "Would you like to try a different term?"
            )

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
            "Hi there! Ask me to find contacts in your network—"
            "for example, 'Find designers at Google'—"
            "and I'll look them up for you."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
