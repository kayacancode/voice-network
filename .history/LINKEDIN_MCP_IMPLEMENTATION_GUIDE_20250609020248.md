# LinkedIn MCP Implementation Guide

This guide provides step-by-step instructions to implement and integrate the LinkedIn MCP (Model Context Protocol) server with your existing AI voice network assistant.

## Overview

The LinkedIn MCP server extends your existing voice assistant to automatically:
1. Fetch your LinkedIn connections and their connections
2. Store them in Pinecone with semantic embeddings
3. Enable natural language search through your professional network
4. Integrate seamlessly with your existing voice interface

## Implementation Steps

### Step 1: Prerequisites Setup

Before starting, ensure you have:

- [x] **Your existing voice assistant project** (already ✅)
- [x] **Pinecone account and API key** (already ✅)
- [x] **OpenAI API key** (already ✅)
- [ ] **LinkedIn account with active connections**
- [ ] **Node.js 18+** and npm/pnpm

### Step 2: Install MCP Server Dependencies

Navigate to the MCP server directory and install dependencies:

```bash
cd mcp-server
npm install
```

### Step 3: Environment Configuration

Create a `.env` file in the `mcp-server` directory:

```env
# OpenAI Configuration (same as your main app)
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration (same as your main app)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-network

# LinkedIn Credentials (for automatic login)
LINKEDIN_EMAIL=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password

# Optional: Configuration
MAX_CONNECTIONS_PER_FETCH=500
BATCH_SIZE=10
RATE_LIMIT_DELAY_MS=1000
```

### Step 4: Build and Test the MCP Server

```bash
# Build the TypeScript code
npm run build

# Test the server
npm start
```

### Step 5: Integration with Your Voice Assistant

#### Option A: Direct Integration (Recommended)

Add the LinkedIn search functionality directly to your existing voice assistant by creating a new API endpoint:

```typescript
// app/api/linkedin-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LinkedInMCPServer } from '../../../mcp-server/src/index';

const mcpServer = new LinkedInMCPServer();

export async function POST(req: NextRequest) {
  try {
    const { query, includeSecondDegree = false, limit = 10 } = await req.json();
    
    const results = await mcpServer.searchNetwork(query, {
      limit,
      includeSecondDegree,
    });
    
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search LinkedIn network' },
      { status: 500 }
    );
  }
}
```

#### Option B: MCP Client Integration

Install the MCP client in your main application:

```bash
# In your main project directory
pnpm add @modelcontextprotocol/sdk
```

Create an MCP client helper:

```typescript
// lib/linkedin-mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class LinkedInMCPClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['../mcp-server/dist/index.js'],
      env: {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        PINECONE_API_KEY: process.env.PINECONE_API_KEY,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
      },
    });
    
    this.client = new Client(
      {
        name: 'linkedin-network-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async searchNetwork(query: string, options: any = {}) {
    const response = await this.client.callTool({
      name: 'search_network',
      arguments: { query, ...options },
    });
    
    return response.content[0].text;
  }

  async fetchConnections(options: any = {}) {
    const response = await this.client.callTool({
      name: 'fetch_linkedin_connections',
      arguments: options,
    });
    
    return response.content[0].text;
  }
}
```

### Step 6: Update Your Voice Agent

Modify your existing `agent.py` to include LinkedIn search capabilities:

```python
# agent.py (add these imports and functions)
import requests
import json

class LinkedInNetworkAgent:
    def __init__(self, linkedin_api_endpoint):
        self.linkedin_api_endpoint = linkedin_api_endpoint
    
    async def search_linkedin_network(self, query: str, include_second_degree: bool = False):
        """Search through LinkedIn network using natural language."""
        try:
            response = requests.post(
                f"{self.linkedin_api_endpoint}/api/linkedin-search",
                json={
                    "query": query,
                    "includeSecondDegree": include_second_degree,
                    "limit": 10
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return self.format_linkedin_results(data["results"])
            else:
                return "Sorry, I couldn't search your LinkedIn network right now."
                
        except Exception as e:
            print(f"LinkedIn search error: {e}")
            return "I encountered an error searching your LinkedIn network."
    
    def format_linkedin_results(self, results):
        """Format LinkedIn search results for voice response."""
        if not results:
            return "I didn't find any matching connections in your LinkedIn network."
        
        response = f"I found {len(results)} connections:\n\n"
        
        for i, person in enumerate(results[:5], 1):  # Limit to top 5 for voice
            response += f"{i}. {person['name']}"
            if person.get('title'):
                response += f", {person['title']}"
            if person.get('company'):
                response += f" at {person['company']}"
            if person.get('location'):
                response += f" in {person['location']}"
            response += f" (relevance: {person.get('score', 0):.2f})\n"
        
        return response

# Add to your main VoiceAssistant class
linkedin_agent = LinkedInNetworkAgent("http://localhost:3000")

# Add this to your conversation handling
async def handle_linkedin_queries(self, query: str):
    """Handle LinkedIn-related queries."""
    linkedin_keywords = [
        "linkedin", "network", "connections", "professional contacts",
        "find someone", "who do i know", "contacts at", "people at"
    ]
    
    if any(keyword in query.lower() for keyword in linkedin_keywords):
        # Extract the actual search query
        search_query = query
        for keyword in ["find", "who do i know", "show me", "search for"]:
            if keyword in query.lower():
                search_query = query.lower().split(keyword)[-1].strip()
        
        return await linkedin_agent.search_linkedin_network(search_query)
    
    return None
```

### Step 7: Initial Data Population

Run the initial LinkedIn data fetch:

```bash
# Start the MCP server
cd mcp-server
npm start

# In another terminal, make a test call or use your voice assistant:
# "Hey assistant, fetch my LinkedIn connections"
```

Or use the API directly:

```bash
curl -X POST http://localhost:3000/api/linkedin-search \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fetch_connections",
    "maxConnections": 500,
    "includeSecondDegree": false
  }'
```

### Step 8: Voice Interface Integration

Update your voice assistant to recognize LinkedIn-related queries:

```typescript
// In your voice assistant component
const handleVoiceQuery = async (transcript: string) => {
  // Check if it's a LinkedIn query
  const linkedinKeywords = [
    'linkedin', 'network', 'connections', 'professional',
    'find someone', 'who do i know', 'contacts at', 'people at'
  ];
  
  const isLinkedInQuery = linkedinKeywords.some(keyword => 
    transcript.toLowerCase().includes(keyword)
  );
  
  if (isLinkedInQuery) {
    // Route to LinkedIn search
    const response = await fetch('/api/linkedin-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: transcript,
        limit: 5, // Limit for voice responses
      }),
    });
    
    const data = await response.json();
    return formatLinkedInResponse(data.results);
  }
  
  // Continue with regular voice assistant logic
  return await handleRegularQuery(transcript);
};
```

### Step 9: Testing and Validation

Test your implementation with these voice queries:

1. **"Fetch my LinkedIn connections"** - Initial data population
2. **"Find software engineers in my network"** - Role-based search
3. **"Who do I know at Google?"** - Company-based search
4. **"Show me people in San Francisco"** - Location-based search
5. **"Find product managers"** - General role search

### Step 10: Production Deployment

For production deployment:

1. **Security**:
   ```env
   # Use secure environment variables
   LINKEDIN_EMAIL=
   LINKEDIN_PASSWORD=
   # Consider using LinkedIn's official API instead
   ```

2. **Rate Limiting**:
   ```typescript
   // Add rate limiting to your API endpoints
   import { rateLimiter } from '@/lib/rate-limiter';
   
   export async function POST(req: NextRequest) {
     await rateLimiter.check(req.ip, 10, '1m'); // 10 requests per minute
     // ... rest of your code
   }
   ```

3. **Error Handling**:
   ```typescript
   // Robust error handling
   try {
     const results = await searchLinkedInNetwork(query);
     return results;
   } catch (error) {
     console.error('LinkedIn search failed:', error);
     return "I'm having trouble accessing your LinkedIn network right now.";
   }
   ```

## Usage Examples

Once implemented, your voice assistant can handle queries like:

- **"Find designers in my network"**
- **"Who do I know at Microsoft?"**
- **"Show me software engineers in Seattle"**
- **"Find product managers with AI experience"**
- **"People in my network who work at startups"**

## Maintenance and Updates

### Regular Data Refresh

Set up a scheduled job to refresh your LinkedIn data:

```typescript
// lib/scheduled-linkedin-refresh.ts
import cron from 'node-cron';

// Refresh connections weekly
cron.schedule('0 0 * * 0', async () => {
  try {
    await fetchLinkedInConnections({
      maxConnections: 1000,
      includeSecondDegree: false,
    });
    console.log('LinkedIn data refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh LinkedIn data:', error);
  }
});
```

### Monitoring and Analytics

Track usage and performance:

```typescript
// Add to your API endpoints
const analytics = {
  searchQueries: 0,
  successfulSearches: 0,
  averageResponseTime: 0,
};

// Log metrics
console.log('LinkedIn Network Stats:', {
  totalConnections: await getNetworkStats(),
  searchAccuracy: analytics.successfulSearches / analytics.searchQueries,
  avgResponseTime: analytics.averageResponseTime,
});
```

## Troubleshooting

### Common Issues and Solutions

1. **LinkedIn Authentication Failed**:
   - Check credentials in `.env`
   - Handle 2FA manually in browser
   - Consider LinkedIn API alternatives

2. **No Search Results**:
   - Verify Pinecone index has data
   - Check embedding model compatibility
   - Test with broader search queries

3. **Slow Response Times**:
   - Optimize Pinecone index settings
   - Reduce batch sizes
   - Implement caching for frequent queries

4. **Rate Limiting**:
   - Reduce scraping frequency
   - Implement exponential backoff
   - Use official LinkedIn API when possible

## Security Considerations

- **Never commit credentials** to version control
- **Use environment variables** for all sensitive data
- **Implement proper rate limiting** to respect LinkedIn's ToS
- **Consider data retention policies** for stored connection data
- **Use HTTPS** for all API communications

## Next Steps

After successful implementation:

1. **Extend to other platforms** (Twitter, GitHub, etc.)
2. **Add advanced filtering** (skills, experience level, etc.)
3. **Implement relationship mapping** (mutual connections, paths)
4. **Add conversation memory** (remember previous searches)
5. **Create analytics dashboard** (network insights, search patterns)

This implementation gives you a powerful LinkedIn-integrated voice assistant that can help you navigate and search your professional network using natural language queries! 