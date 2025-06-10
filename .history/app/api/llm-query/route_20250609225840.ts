import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const LLM_PROMPT = `You are the AI assistant for a voice-driven network search app.

Your tasks:
- Process user voice input into a search query
- Extract meaningful search terms from natural language
- Consider professional titles, companies, skills, locations, industries
- Keep responses concise and actionable

Return only valid JSON in this format:
{
  "refined_query": "string",
  "updated_conversation_state": {...}
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

Process the input and respond with appropriate JSON:`;

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

    // Parse the JSON response (handle markdown code blocks)
    let llmResponse;
    try {
      llmResponse = JSON.parse(responseContent.replace(/```json\n?|\n?```/g, ''));
    } catch (e) {
      console.error('Failed to parse LLM response:', responseContent);
      throw new Error('Invalid response format from LLM');
    }

    // Always return success with search intent
    return NextResponse.json({
      success: true,
      intent: 'search',  // Always search
      refined_query: llmResponse.refined_query,
      updated_conversation_state: llmResponse.updated_conversation_state || {}
    });

  } catch (error) {
    console.error('Error processing LLM query:', error);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
} 