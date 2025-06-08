import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 10 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search in Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false,
    });

    // Transform results to contact format
    const contacts = searchResponse.matches?.map((match) => {
      const metadata = match.metadata as any;
      return {
        id: match.id,
        name: metadata.name || "",
        title: metadata.title || "",
        company: metadata.company || "",
        email: metadata.email || "",
        linkedin_url: metadata.linkedin_url || "",
        instagram_handle: metadata.instagram_handle || "",
        description: metadata.description || "",
        skills: metadata.skills || [],
        location: metadata.location || "",
        industry: metadata.industry || "",
        connections: metadata.connections || 0,
        followers: metadata.followers || 0,
        score: match.score,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      results: contacts,
      query,
      totalResults: contacts.length,
    });

  } catch (error) {
    console.error("Error searching contacts:", error);
    return NextResponse.json(
      { error: "Failed to search contacts" },
      { status: 500 }
    );
  }
} 