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
    const { contacts, type } = await request.json();

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Invalid contacts data" },
        { status: 400 }
      );
    }

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Process contacts in batches for efficiency
    const batchSize = 10;
    const totalBatches = Math.ceil(contacts.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = contacts.slice(i * batchSize, (i + 1) * batchSize);
      const vectors = [];

      for (const contact of batch) {
        // Create a text representation of the contact for embedding
        const contactText = createContactText(contact);
        
        try {
          // Generate embedding using OpenAI
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: contactText,
          });

          const embedding = embeddingResponse.data[0].embedding;

          vectors.push({
            id: contact.id,
            values: embedding,
            metadata: {
              name: contact.name,
              title: contact.title || "",
              company: contact.company || "",
              email: contact.email || "",
              linkedin_url: contact.linkedin_url || "",
              instagram_handle: contact.instagram_handle || "",
              description: contact.description || "",
              skills: contact.skills || [],
              location: contact.location || "",
              industry: contact.industry || "",
              connections: contact.connections || 0,
              followers: contact.followers || 0,
              type: type,
              text: contactText,
            },
          });
        } catch (embeddingError) {
          console.error(`Error creating embedding for contact ${contact.id}:`, embeddingError);
          // Continue with other contacts
        }
      }

      if (vectors.length > 0) {
        // Upsert vectors to Pinecone
        await index.upsert(vectors);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${contacts.length} contacts`,
      uploadedCount: contacts.length,
    });

  } catch (error) {
    console.error("Error uploading contacts:", error);
    return NextResponse.json(
      { error: "Failed to upload contacts" },
      { status: 500 }
    );
  }
}

function createContactText(contact: any): string {
  const parts = [];
  
  if (contact.name) parts.push(`Name: ${contact.name}`);
  if (contact.title) parts.push(`Title: ${contact.title}`);
  if (contact.company) parts.push(`Company: ${contact.company}`);
  if (contact.location) parts.push(`Location: ${contact.location}`);
  if (contact.industry) parts.push(`Industry: ${contact.industry}`);
  if (contact.description) parts.push(`Description: ${contact.description}`);
  if (contact.skills && contact.skills.length > 0) {
    parts.push(`Skills: ${contact.skills.join(", ")}`);
  }
  if (contact.email) parts.push(`Email: ${contact.email}`);
  if (contact.instagram_handle) parts.push(`Instagram: ${contact.instagram_handle}`);
  
  return parts.join(". ");
} 