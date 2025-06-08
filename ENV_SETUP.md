# Environment Setup

Create a `.env.local` file in the root directory with the following environment variables:

## Required Environment Variables

```bash
# LiveKit Configuration (existing)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=your_livekit_url

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Pinecone Configuration
PINECONE_API_KEY=pcsk_42P8wi_3v7Piasutc91ttbZ736bS1sFJGqHHtNJwsoqTYUCBDDC1SCxewrNBDEPJeTChD2
PINECONE_INDEX_NAME=ai-network

# Optional: Connection Details Endpoint
NEXT_PUBLIC_CONN_DETAILS_ENDPOINT=/api/connection-details
```

## Setup Instructions

1. Copy your actual API keys into the `.env.local` file
2. Make sure your Pinecone index is created and configured with 1536 dimensions (for OpenAI text-embedding-3-small)
3. Ensure your LiveKit server is running and accessible
4. Install dependencies: `npm install` or `pnpm install`
5. Run the development server: `npm run dev` or `pnpm dev`

## Pinecone Index Setup

Your Pinecone index should be configured with:
- **Dimensions**: 1536 (for OpenAI text-embedding-3-small)
- **Metric**: cosine
- **Pod Type**: Starter (for development)

## Required Features

This application provides:
- ✅ Upload LinkedIn contacts (CSV)
- ✅ Upload Instagram followers (CSV or JSON)
- ✅ Speak voice queries in realtime (via LiveKit)
- ✅ Use an LLM agent (OpenAI GPT-4o) to refine search queries and manage conversational flow
- ✅ Perform semantic search of contacts via Pinecone
- ✅ Stream live search results back to the UI
- ✅ Support follow-up questions (conversation loop) 