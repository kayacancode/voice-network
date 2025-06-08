import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const LLM_PROMPT = `You are the AI assistant for a voice-driven network search app.

Your tasks:
- Analyze user voice input.
- Classify intent as: "search", "refine", or "clarify".
- If "search", generate a Pinecone query string.
- If "refine", generate an updated Pinecone query string based on conversation_state.
- If "clarify", return a follow-up question.
- Maintain updated conversation_state.

Guidelines:
- Extract meaningful search terms from natural language
- Consider professional titles, companies, skills, locations, industries
- For refinements, build upon previous queries and results
- Ask clarifying questions when the request is ambiguous
- Keep responses concise and actionable

Return only valid JSON in this format:
{
  "intent": "search" | "refine" | "clarify",
  "refined_query": "string",
  "updated_conversation_state": {...},
  "optional_llm_response": "string"
}`;

export async function POST(request: NextRequest) {
  try {
    const { user_transcript, conversation_state } = await request.json();

    if (!user_transcript || typeof user_transcript !== "string") {
      return NextResponse.json(
        { error: "User transcript is required" },
        { status: 400 }
      );
    }

    const prompt = `${LLM_PROMPT}

Inputs:
- user_transcript: "${user_transcript}"
- current conversation_state: ${JSON.stringify(conversation_state || {})}

Analyze the input and respond with appropriate JSON:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let llmResponse;
    try {
      llmResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.error("Raw response:", responseContent);
      
      // Fallback response if JSON parsing fails
      llmResponse = {
        intent: "search",
        refined_query: user_transcript,
        updated_conversation_state: {
          prior_queries: [user_transcript],
          prior_results: [],
          context: `User said: ${user_transcript}`,
        },
        optional_llm_response: "I'll search for that in your network.",
      };
    }

    // Validate the response structure
    if (!llmResponse.intent || !["search", "refine", "clarify"].includes(llmResponse.intent)) {
      llmResponse.intent = "search";
    }

    if (!llmResponse.refined_query) {
      llmResponse.refined_query = user_transcript;
    }

    if (!llmResponse.updated_conversation_state) {
      llmResponse.updated_conversation_state = {
        prior_queries: [user_transcript],
        prior_results: [],
        context: `User said: ${user_transcript}`,
      };
    }

    return NextResponse.json({
      success: true,
      ...llmResponse,
    });

  } catch (error) {
    console.error("Error processing LLM query:", error);
    
    // Return a fallback response
    return NextResponse.json({
      success: true,
      intent: "search",
      refined_query: user_transcript || "network search",
      updated_conversation_state: {
        prior_queries: [user_transcript || "network search"],
        prior_results: [],
        context: "Error occurred, falling back to basic search",
      },
      optional_llm_response: "I'll search your network for relevant contacts.",
    });
  }
} 