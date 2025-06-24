# Hybrid Search & Network Intelligence Guide

## Overview

Your AI Voice Network Assistant now features **Intelligent Hybrid Search** - a powerful system that combines your local Pinecone vector database with real-time web research through Perplexity API. This creates a more contextual and informed research experience.

## How It Works

### 1. Network-Informed Research
When you ask about someone, the system:

1. **Searches your local network first** (Pinecone vector database)
2. **Finds related connections** (colleagues, industry peers, similar roles)
3. **Uses network context to inform web searches** (Perplexity API)
4. **Delivers comprehensive briefings** with both local and web data

### 2. Enhanced Search Flow

```
Your Query → Local Network Analysis → Context-Aware Web Search → Intelligent Response
```

## New Features

### Intelligent Search Tool
The new `intelligent_search` function provides:

- **Network relationship mapping** - finds colleagues, industry peers, and related contacts
- **Context-aware web queries** - uses your network data to make more targeted searches
- **Warm introduction opportunities** - identifies connection paths through your network
- **Comprehensive briefings** - combines all data sources intelligently

### Enhanced Web Research
The improved `_perform_web_research` method now:

- **Analyzes your network first** to gather context
- **Creates targeted search queries** based on your connections
- **Includes network insights** in search prompts
- **Provides connection-aware results**

### Network Connection Discovery
The new `_find_network_connections` method:

- **Finds direct matches** for the person in your network
- **Identifies company colleagues** you already know
- **Discovers industry peers** with similar roles
- **Maps related contacts** through broader searches

## Voice Commands

### Basic Network Search
- **"Find engineers at Google"**
- **"Show me designers"**
- **"Who do I know at Apple?"**

### Intelligent Hybrid Search
- **"Research Sarah Chen and show network insights"**
- **"Tell me about John Smith and our connections"**
- **"Intelligent search for Mike Johnson"**
- **"Analyze David Lee with network context"**

### Comprehensive Research
- **"Brief me on Alice Wang"** - Uses enhanced research
- **"Tell me about Bob Chen"** - Now includes network analysis
- **"Research Jane Doe"** - Combines all data sources

## Example Responses

### Standard Search (Before)
```
User: "Tell me about Sarah Chen"
Response: "Sarah Chen is a Software Engineer at Google. Recent web research shows she worked on AI projects..."
```

### Intelligent Hybrid Search (Now)
```
User: "Research Sarah Chen and show network insights"
Response: "Sarah Chen is a Software Engineer at Google. Network connections: You know 3 other people at Google, including Mike Johnson. You have 5 contacts in similar engineering roles. Recent research: Sarah recently published papers on machine learning and was promoted to Senior Engineer. You have warm introduction opportunities through your existing network."
```

## Technical Implementation

### Vector Similarity + Graph Analysis
- Uses **embeddings** for semantic similarity
- Employs **relationship mapping** for network analysis
- Combines **local knowledge** with **real-time data**

### Context-Aware Queries
Web searches now include context like:
```
"Research Sarah Chen Google engineer (Note: User knows 3 people at Google) (Note: User has 5 contacts in similar roles)"
```

### Network Insights Integration
Results include:
- **Relevance scores** from vector search
- **Connection paths** through your network
- **Industry context** from similar contacts
- **Introduction opportunities** via mutual connections

## Benefits

### More Relevant Results
- **Targeted searches** based on your network
- **Context-aware** web research
- **Connection opportunities** highlighted

### Better Decision Making
- **Warm introduction paths** identified
- **Shared context** with existing contacts
- **Industry insights** from your network

### Comprehensive Intelligence
- **Local + web data** combined
- **Relationship mapping** included
- **Actionable insights** provided

## Configuration

### Required APIs
1. **Pinecone** - For vector search of your network
2. **OpenAI** - For embeddings and LLM processing  
3. **Perplexity** - For real-time web research

### Environment Setup
```bash
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=ai-network
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key
```

## Tips for Best Results

### Upload Quality Data
- **LinkedIn connections** with complete profiles
- **Instagram followers** with business context
- **Contact details** including titles and companies

### Use Specific Queries
- Include **company names** when known
- Mention **job titles** for better matching
- Ask for **"network insights"** explicitly

### Follow-Up Questions
- **"Who else do I know at their company?"**
- **"Find similar contacts in my network"**
- **"What's the best introduction path?"**

## Troubleshooting

### If searches seem basic:
- Try using **"intelligent search"** explicitly
- Ask for **"network insights"** or **"connections"**
- Ensure your **Perplexity API key** is configured

### If network analysis is limited:
- Upload more **contact data** to Pinecone
- Use **specific company/role** terms
- Try **broader search terms** first

### If web research fails:
- Check **Perplexity API key** configuration
- Verify **internet connectivity**
- Try **simpler person names**

## Next Steps

This hybrid search system will continue to evolve with:
- **Enhanced relationship mapping**
- **Better context understanding**
- **More sophisticated network analysis**
- **Improved introduction recommendations**

The goal is to make your professional network intelligence as powerful and actionable as possible! 