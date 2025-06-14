<img src="./.github/assets/app-icon.png" alt="Voice Assistant App Icon" width="100" height="100">

# AI Voice Network Assistant

An AI-powered voice assistant that helps you search through your professional network contacts using natural language voice queries. Upload your LinkedIn contacts and Instagram followers, then ask questions like "Find designers" or "Who do I know at Google?" and get instant voice responses.

This application combines a Next.js frontend with a LiveKit Python agent backend, using OpenAI for LLM capabilities and Pinecone for semantic search.

![App screenshot](/.github/assets/frontend-screenshot.jpeg)

## Features

- 🎤 **Voice Interface**: Speak naturally to search your contacts
- 📊 **Data Upload**: Import LinkedIn contacts (CSV) and Instagram followers (JSON)
- 🔍 **Semantic Search**: Find people by name, title, company, location, skills, or industry
- 🧠 **AI Agent**: Powered by OpenAI GPT-4o for natural conversation flow
- 🎯 **Real-time Results**: Stream live search results back to the UI
- 💬 **Follow-up Questions**: Continue the conversation with additional queries

## Prerequisites

Before starting, ensure you have:

- **Node.js** (version 18 or higher)
- **Python** (version 3.8 or higher)
- **pnpm** package manager (`npm install -g pnpm`)
- **API Keys** for:
  - [LiveKit](https://livekit.io/) (for voice capabilities)
  - [OpenAI](https://openai.com/) (for LLM and embeddings)
  - [Pinecone](https://www.pinecone.io/) (for vector database)

## Quick Setup

### 1. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=your_livekit_url

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ai-network

# Connection Details Endpoint
NEXT_PUBLIC_CONN_DETAILS_ENDPOINT=/api/connection-details
```

### 2. Pinecone Index Setup

Create a Pinecone index with these specifications:
- **Name**: `ai-network` (or match your `PINECONE_INDEX_NAME`)
- **Dimensions**: 1536 (for OpenAI text-embedding-3-small)
- **Metric**: cosine
- **Pod Type**: Starter (for development)

### 3. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install Python dependencies for the agent
pip install -r requirements.txt
# Or if no requirements.txt exists:
pip install livekit-agents livekit-plugins-openai pinecone-client python-dotenv openai
```

## Starting the Application

You need to run both the frontend and the Python agent:

### 1. Start the Next.js Frontend

```bash
pnpm dev
```

The frontend will be available at `http://localhost:3000`

### 2. Start the Python Agent (in a separate terminal)

```bash
python agent.py
```

The agent will connect to your LiveKit server and be ready to handle voice interactions.

## How to Use

### 1. Upload Your Network Data

The application expects contact data in specific formats:

**LinkedIn Contacts (CSV)**:
- See `sample-data/linkedin-contacts-example.csv` for the expected format
- Should include columns: name, title, company, location, industry, etc.

**Instagram Followers (JSON)**:
- See `sample-data/instagram-followers-example.json` for the expected format
- Should include user information with names and profiles

### 2. Voice Interaction

Once both services are running and your data is uploaded:

1. **Connect**: Open the web app and join a voice session
2. **Speak**: Use natural language to search your network:
   - "Find designers"
   - "Who do I know at Google?"
   - "Show me software engineers"
   - "People in San Francisco"
   - "Anyone in marketing?"

3. **Listen**: The AI will search your database and respond with relevant contacts
4. **Follow up**: Ask clarifying questions or refine your search

### Example Voice Queries

- **By Role**: "Find product managers", "Show me designers"
- **By Company**: "Who do I know at Microsoft?", "People working at startups"
- **By Location**: "Contacts in New York", "Anyone in the Bay Area?"
- **By Skills**: "Find someone who knows React", "People with AI experience"
- **General**: "Who's in my network?", "Show me recent connections"

## Troubleshooting

### Common Issues

**Agent not connecting**:
- Verify your LiveKit credentials in `.env.local`
- Ensure your LiveKit server is running and accessible
- Check that the Python agent started without errors

**No search results**:
- Confirm you've uploaded contact data
- Verify your Pinecone index is created with correct dimensions (1536)
- Check that your OpenAI API key has sufficient credits

**Voice not working**:
- Ensure microphone permissions are granted in your browser
- Test with a simple query first: "Hello"
- Check browser console for any WebRTC errors

### Development Tips

- Monitor the Python agent logs to see search queries and results
- Use the browser's developer tools to debug frontend issues
- Test with the sample data files first before uploading your own data

## Data Privacy

- All contact data is stored in your own Pinecone index
- Voice interactions are processed through LiveKit and OpenAI
- No contact data is shared or stored by this application beyond your configured services

## Contributing

This template is open source and we welcome contributions! Please open a PR or issue through GitHub, and don't forget to join us in the [LiveKit Community Slack](https://livekit.io/join-slack)!

## API Services Used

- **[LiveKit](https://livekit.io/)**: Real-time voice communication
- **[OpenAI](https://openai.com/)**: GPT-4o for conversations, text-embedding-3-small for search
- **[Pinecone](https://www.pinecone.io/)**: Vector database for semantic search
