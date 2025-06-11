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

interface MemoryExtraction {
  person: string;
  details: string;
  confidence: number;
  context?: string;
}

interface TranscriptPayload {
  text: string;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TranscriptPayload = await request.json();
    
    if (!body.text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Parse and normalize raw text input
    const normalizedText = body.text.trim();
    
    if (normalizedText.length < 10) {
      return NextResponse.json(
        { error: 'Text too short to extract meaningful memory' },
        { status: 400 }
      );
    }

    // Entity extraction using LLM
    const extractedMemory = await extractPersonMemory(normalizedText);
    
    if (!extractedMemory || extractedMemory.confidence < 0.7) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No clear person or memory found in the text',
          confidence: extractedMemory?.confidence || 0
        },
        { status: 200 }
      );
    }

    // Generate embedding and store in Pinecone
    const memoryId = await storeMemoryInPinecone(
      extractedMemory,
      normalizedText,
      body.userId || 'default-user'
    );

    // Return success with voice feedback message
    const confirmationMessage = formatConfirmationMessage(extractedMemory);
    
    return NextResponse.json({
      success: true,
      memoryId,
      person: extractedMemory.person,
      details: extractedMemory.details,
      confirmationMessage,
      ssml: formatSSMLConfirmation(extractedMemory)
    });

  } catch (error) {
    console.error('Error processing memory capture:', error);
    return NextResponse.json(
      { error: 'Failed to process memory capture' },
      { status: 500 }
    );
  }
}

async function extractPersonMemory(text: string): Promise<MemoryExtraction | null> {
  try {
    const prompt = `
    Extract person and memory information from the following text. The text represents something a user said about meeting someone or learning something about a person.

    Text: "${text}"

    Please extract:
    1. The person's name (first name, full name, or how they're referred to)
    2. The key details/facts about this person
    3. Your confidence level (0-1) that this is a meaningful memory about a person

    Respond ONLY with valid JSON in this exact format:
    {
      "person": "person's name",
      "details": "key facts about this person",
      "confidence": 0.95,
      "context": "optional additional context"
    }

    Rules:
    - If no clear person is mentioned, set confidence to 0
    - Focus on factual information (job, company, skills, interests, etc.)
    - Keep details concise but informative
    - Use the exact name format mentioned in the text
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert at extracting person-related information from conversational text. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate JSON response
    const extracted = JSON.parse(content) as MemoryExtraction;
    
    // Validate required fields
    if (!extracted.person || !extracted.details || typeof extracted.confidence !== 'number') {
      throw new Error('Invalid extraction format');
    }

    return extracted;

  } catch (error) {
    console.error('Error extracting person memory:', error);
    return null;
  }
}

async function storeMemoryInPinecone(
  memory: MemoryExtraction,
  originalText: string,
  userId: string
): Promise<string> {
  try {
    // Generate embedding for the memory text
    const embeddingText = `${memory.person}: ${memory.details}`;
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText
    });

    const embedding = embeddingResponse.data[0].embedding;
    
    // Create unique ID for this memory
    const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Prepare metadata
    const metadata = {
      type: 'memory',
      person: memory.person.toLowerCase(), // Store lowercase for easier filtering
      personDisplay: memory.person, // Keep original case for display
      details: memory.details,
      originalText: originalText,
      userId: userId,
      timestamp: new Date().toISOString(),
      confidence: memory.confidence,
      context: memory.context || ''
    };

    // Upsert to Pinecone
    await index.upsert([{
      id: memoryId,
      values: embedding,
      metadata: metadata
    }]);

    return memoryId;

  } catch (error) {
    console.error('Error storing memory in Pinecone:', error);
    throw error;
  }
}

function formatConfirmationMessage(memory: MemoryExtraction): string {
  return `Got it—saved that ${memory.person} ${memory.details}`;
}

function formatSSMLConfirmation(memory: MemoryExtraction): string {
  return `<speak>Got it. Saved that <emphasis level="moderate">${memory.person}</emphasis> ${memory.details}.</speak>`;
} 