import { NextRequest, NextResponse } from 'next/server';
import { getNextMeeting, getBriefForContact } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  try {
    // Get the next meeting from mock calendar data
    const nextMeeting = getNextMeeting();
    
    if (!nextMeeting) {
      return NextResponse.json({
        success: false,
        message: "You don't have any upcoming meetings today.",
        hasNextMeeting: false
      });
    }

    // Extract the primary attendee (assuming first attendee is the main contact)
    const primaryAttendeeEmail = nextMeeting.attendees[0];
    const contactBrief = getBriefForContact(primaryAttendeeEmail);

    if (!contactBrief) {
      // Fallback response if no brief is available
      const timeUntilMeeting = Math.round((nextMeeting.start.getTime() - Date.now()) / (1000 * 60));
      const timeText = timeUntilMeeting < 60 ? `${timeUntilMeeting} minutes` : `${Math.round(timeUntilMeeting / 60)} hours`;
      
      return NextResponse.json({
        success: true,
        hasNextMeeting: true,
        meeting: nextMeeting,
        spokenBrief: `Your next meeting is "${nextMeeting.title}" in ${timeText}. Unfortunately, I don't have detailed briefing information for this contact yet.`,
        brief: null
      });
    }

    // Calculate time until meeting
    const timeUntilMeeting = Math.round((nextMeeting.start.getTime() - Date.now()) / (1000 * 60));
    const timeText = timeUntilMeeting < 60 ? 
      `${timeUntilMeeting} minutes` : 
      `${Math.round(timeUntilMeeting / 60)} hours`;

    // Generate spoken briefing
    const spokenBrief = generateSpokenBrief(nextMeeting, contactBrief, timeText);

    return NextResponse.json({
      success: true,
      hasNextMeeting: true,
      meeting: nextMeeting,
      brief: contactBrief,
      spokenBrief,
      timeUntilMeeting: timeUntilMeeting
    });

  } catch (error) {
    console.error('Calendar brief error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate calendar briefing',
      message: "I'm having trouble accessing your calendar right now."
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    // Handle specific voice queries
    if (query?.toLowerCase().includes('next meeting') || 
        query?.toLowerCase().includes('who am i meeting') ||
        query?.toLowerCase().includes('upcoming meeting')) {
      
      // Delegate to GET handler
      return GET(request);
    }

    // Handle specific person briefing requests
    const personMatch = query?.match(/(?:brief me on|tell me about|who is)\s+([A-Z][a-zA-Z\s]+)/i);
    if (personMatch) {
      const personName = personMatch[1].trim();
      
      // Find contact by name in our mock data
      const contactEmail = findContactEmailByName(personName);
      if (contactEmail) {
        const contactBrief = getBriefForContact(contactEmail);
        if (contactBrief) {
          const spokenBrief = generatePersonBrief(contactBrief);
          return NextResponse.json({
            success: true,
            type: 'person_brief',
            brief: contactBrief,
            spokenBrief
          });
        }
      }
      
      return NextResponse.json({
        success: false,
        message: `I don't have briefing information for ${personName}. You might want to upload their contact data or check if the name is spelled correctly.`
      });
    }

    return NextResponse.json({
      success: false,
      message: "I didn't understand that request. Try asking 'Who am I meeting next?' or 'Brief me on [person's name]'."
    });

  } catch (error) {
    console.error('Calendar brief POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process briefing request'
    }, { status: 500 });
  }
}

function generateSpokenBrief(meeting: any, brief: any, timeText: string): string {
  const { contact, context, conversation_starters, follow_up_suggestions, last_interaction } = brief;
  
  let spokenBrief = `Your next meeting is with ${contact.name}, ${contact.title} at ${contact.company}, in ${timeText}. `;
  
  // Add context
  spokenBrief += `${context} `;
  
  // Add relationship context
  if (contact.relationship_strength === 'strong') {
    spokenBrief += `You have a strong relationship with ${contact.name.split(' ')[0]}. `;
  } else if (contact.relationship_strength === 'medium') {
    spokenBrief += `You have worked with ${contact.name.split(' ')[0]} before. `;
  }
  
  // Add last interaction if recent
  if (last_interaction && last_interaction.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    spokenBrief += `Your last interaction was ${last_interaction.summary.toLowerCase()}. `;
  }
  
  // Add a conversation starter
  if (conversation_starters && conversation_starters.length > 0) {
    spokenBrief += `A good conversation starter might be: "${conversation_starters[0]}" `;
  }
  
  // Add a follow-up suggestion
  if (follow_up_suggestions && follow_up_suggestions.length > 0) {
    spokenBrief += `Consider ${follow_up_suggestions[0].toLowerCase()}.`;
  }
  
  return spokenBrief;
}

function generatePersonBrief(brief: any): string {
  const { contact, context, recent_activity } = brief;
  
  let spokenBrief = `${contact.name} is a ${contact.title} at ${contact.company}. `;
  spokenBrief += `${context} `;
  
  if (recent_activity && recent_activity.length > 0) {
    spokenBrief += `Recently, they ${recent_activity[0].toLowerCase()}. `;
  }
  
  if (contact.influence_score && contact.influence_score > 85) {
    spokenBrief += `They're a high-influence contact with a score of ${contact.influence_score}. `;
  }
  
  return spokenBrief;
}

function findContactEmailByName(name: string): string | null {
  // Simple name matching for demo - in production this would be more sophisticated
  const nameMap: { [key: string]: string } = {
    'sarah chen': 'sarah.chen@meta.com',
    'sarah': 'sarah.chen@meta.com',
    'marcus johnson': 'marcus.johnson@nvidia.com', 
    'marcus': 'marcus.johnson@nvidia.com',
    'elena rodriguez': 'elena.rodriguez@mckinsey.com',
    'elena': 'elena.rodriguez@mckinsey.com'
  };
  
  return nameMap[name.toLowerCase()] || null;
} 