import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pc.index(process.env.PINECONE_INDEX_NAME || 'ai-network');

interface RecallQuery {
  query: string;
  userId?: string;
  personFilter?: string;
}

interface MemoryMatch {
  person: string;
  details: string;
  timestamp: string;
  confidence: number;
  score: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecallQuery = await request.json();
    
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Extract person name from query if mentioned
    const personFromQuery = await extractPersonFromQuery(body.query);
    const personFilter = body.personFilter || personFromQuery;

    // Search for memories
    const memories = await searchMemories(
      body.query,
      body.userId || 'default-user',
      personFilter
    );

    if (memories.length === 0) {
      const noResultsMessage = formatNoResultsMessage(body.query, personFilter);
      return NextResponse.json({
        success: false,
        message: noResultsMessage,
        ssml: formatSSMLNoResults(body.query, personFilter),
        memories: []
      });
    }

    // Format response with the best match
    const bestMatch = memories[0];
    const responseMessage = formatRecallResponse(bestMatch, body.query);
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      ssml: formatSSMLRecall(bestMatch, body.query),
      memories: memories,
      person: bestMatch.person,
      details: bestMatch.details
    });

  } catch (error) {
    console.error('Error processing memory recall:', error);
    return NextResponse.json(
      { error: 'Failed to process memory recall' },
      { status: 500 }
    );
  }
}

async function extractPersonFromQuery(query: string): Promise<string | null> {
  try {
    const prompt = `
    Extract the person's name from this memory recall query, if any person is mentioned.
    
    Query: "${query}"
    
    Respond ONLY with the person's name if clearly mentioned, or "null" if no specific person is mentioned.
    
    Examples:
    - "Where does Sarah work?" → "Sarah"
    - "What did I learn about John?" → "John"
    - "Tell me about engineers" → "null"
    - "What do I know about Maria?" → "Maria"
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You extract person names from queries. Always respond with just the name or "null".' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content === 'null' || !content ? null : content;

  } catch (error) {
    console.error('Error extracting person from query:', error);
    return null;
  }
}

async function searchMemories(
  query: string,
  userId: string,
  personFilter?: string | null
): Promise<MemoryMatch[]> {
  try {
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Prepare filter for Pinecone query
    const filter: any = {
      type: 'memory',
      userId: userId
    };

    // Add person filter if specified
    if (personFilter) {
      filter.person = personFilter.toLowerCase();
    }

    // Query Pinecone
    const searchResponse = await index.query({
      vector: queryEmbedding,
      filter: filter,
      topK: 5,
      includeMetadata: true
    });

    // Process and format results
    const memories: MemoryMatch[] = searchResponse.matches
      .filter(match => match.score && match.score > 0.3) // Minimum relevance threshold
      .map(match => ({
        person: String(match.metadata?.personDisplay || match.metadata?.person || 'Unknown'),
        details: String(match.metadata?.details || ''),
        timestamp: String(match.metadata?.timestamp || ''),
        confidence: Number(match.metadata?.confidence || 0),
        score: match.score || 0
      }))
      .sort((a, b) => b.score - a.score); // Sort by relevance score

    return memories;

  } catch (error) {
    console.error('Error searching memories:', error);
    return [];
  }
}

function formatRecallResponse(memory: MemoryMatch, query: string): string {
  const timeAgo = getTimeAgo(memory.timestamp);
  return `You mentioned ${memory.person} ${memory.details}${timeAgo ? ` (${timeAgo})` : ''}.`;
}

function formatNoResultsMessage(query: string, personFilter?: string | null): string {
  if (personFilter) {
    return `I don't have any memories about ${personFilter} that match your query.`;
  }
  return `I don't have any memories that match "${query}".`;
}

function formatSSMLRecall(memory: MemoryMatch, query: string): string {
  const timeAgo = getTimeAgo(memory.timestamp);
  return `<speak>You mentioned <emphasis level="moderate">${memory.person}</emphasis> ${memory.details}${timeAgo ? `, ${timeAgo}` : ''}.</speak>`;
}

function formatSSMLNoResults(query: string, personFilter?: string | null): string {
  if (personFilter) {
    return `<speak>I don't have any memories about <emphasis level="moderate">${personFilter}</emphasis> that match your query.</speak>`;
  }
  return `<speak>I don't have any memories that match "${query}".</speak>`;
}

function getTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'recently';
    }
  } catch (error) {
    return '';
  }
} 