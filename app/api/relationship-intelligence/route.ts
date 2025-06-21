import { NextRequest, NextResponse } from 'next/server';
import { Contact, RelationshipPath, NetworkAnalysis } from '@/lib/utils';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Initialize Pinecone and OpenAI clients
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const index = pinecone.Index(process.env.PINECONE_INDEX_NAME || 'ai-network');

// Helper function to search contacts in Pinecone
async function searchContactsInPinecone(query: string, topK: number = 50): Promise<Contact[]> {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const searchResponse = await index.query({
      vector: embedding.data[0].embedding,
      topK,
      includeMetadata: true,
    });

    return searchResponse.matches.map(match => ({
      id: match.id,
      name: match.metadata?.name as string,
      title: match.metadata?.title as string,
      company: match.metadata?.company as string,
      email: match.metadata?.email as string,
      linkedin_url: match.metadata?.linkedin_url as string,
      instagram_handle: match.metadata?.instagram_handle as string,
      location: match.metadata?.location as string,
      industry: match.metadata?.industry as string,
      // Set default values for relationship intelligence fields
      influence_score: match.metadata?.influence_score as number || 50,
      seniority_level: (match.metadata?.seniority_level as any) || 'mid',
      decision_maker: match.metadata?.decision_maker as boolean || false,
      relationship_strength: (match.metadata?.relationship_strength as any) || 'weak',
      company_role: (match.metadata?.company_role as any) || 'individual_contributor',
    }));
  } catch (error) {
    console.error('Error searching contacts in Pinecone:', error);
    return [];
  }
}

async function findPathToTarget(target: { name: string; company?: string; title?: string }): Promise<RelationshipPath | null> {
  try {
    // Search for the target contact
    const searchQuery = `${target.name} ${target.company || ''} ${target.title || ''}`.trim();
    const contacts = await searchContactsInPinecone(searchQuery, 20);
    
    const targetContact = contacts.find(c => 
      c.name.toLowerCase().includes(target.name.toLowerCase()) ||
      (target.company && c.company?.toLowerCase().includes(target.company.toLowerCase()))
    );

    if (!targetContact) {
      return null;
    }

    // For now, return a direct path since we don't have mutual connections data
    // This can be enhanced when you have relationship data
    return {
      target: targetContact,
      path: [targetContact],
      degrees: 1,
      strength: targetContact.influence_score || 0,
      recommended_introducer: targetContact,
      introduction_message: `Consider reaching out directly to ${targetContact.name}${targetContact.company ? ` at ${targetContact.company}` : ''}`
    };
  } catch (error) {
    console.error('Error finding path to target:', error);
    return null;
  }
}

function calculatePathStrength(path: Contact[]): number {
  return path.reduce((acc, contact) => acc + (contact.influence_score || 0), 0) / path.length;
}

function generateIntroductionMessage(introducer: Contact, target: Contact): string {
  return `Hi ${introducer.name}, I hope you're doing well! I noticed you know ${target.name} at ${target.company}. I'm interested in connecting with them about ${target.title?.toLowerCase() || 'their work'}. Would you be comfortable making a brief introduction? I'd be happy to share more context about why I'd like to connect. Thanks so much!`;
}

async function analyzeInfluence(name: string, company?: string): Promise<any> {
  try {
    const searchQuery = `${name} ${company || ''}`.trim();
    const contacts = await searchContactsInPinecone(searchQuery, 10);
    
    const contact = contacts.find((c: Contact) => 
      c.name.toLowerCase().includes(name.toLowerCase()) ||
      (company && c.company?.toLowerCase().includes(company.toLowerCase()))
    );

    if (!contact) {
      return {
        found: false,
        message: `I couldn't find ${name}${company ? ` at ${company}` : ''} in your network.`
      };
    }

    const analysis = {
      name: contact.name,
      company: contact.company,
      title: contact.title,
      influence_score: contact.influence_score,
      seniority_level: contact.seniority_level,
      decision_maker: contact.decision_maker,
      relationship_strength: contact.relationship_strength,
      approach_strategy: generateApproachStrategy(contact),
      mutual_connections: 0 // No mutual connections data available yet
    };

    return {
      found: true,
      analysis,
      message: generateInfluenceAnalysis(contact)
    };
  } catch (error) {
    console.error('Error analyzing influence:', error);
    return {
      found: false,
      message: 'Sorry, I had trouble analyzing that person. Please try again.'
    };
  }
}

function generateApproachStrategy(contact: Contact): string {
  if (contact.decision_maker && contact.seniority_level === 'c-level') {
    return 'High-level executive approach: Focus on strategic value and brief, impactful messaging';
  } else if (contact.seniority_level === 'executive') {
    return 'Executive approach: Emphasize business impact and mutual benefits';
  } else if (contact.relationship_strength === 'strong') {
    return 'Direct approach: You can reach out directly given your strong relationship';
  } else {
    return 'Warm introduction recommended: Use mutual connections for better response rate';
  }
}

function generateInfluenceAnalysis(contact: Contact): string {
  const influenceLevel = contact.influence_score! > 80 ? 'very high' : 
                        contact.influence_score! > 60 ? 'high' : 
                        contact.influence_score! > 40 ? 'moderate' : 'low';
  
  return `${contact.name} has ${influenceLevel} influence (score: ${contact.influence_score}/100). They're a ${contact.seniority_level} level ${contact.title} at ${contact.company}. ${contact.decision_maker ? 'They have decision-making authority.' : 'They may not have final decision-making power.'} Your relationship strength is ${contact.relationship_strength}. ${generateApproachStrategy(contact)}`;
}

async function findMutualConnections(company: string): Promise<any> {
  try {
    const contacts = await searchContactsInPinecone(company, 20);
    const companyContacts = contacts.filter((c: Contact) => 
      c.company?.toLowerCase().includes(company.toLowerCase())
    );

    const connectionsAtCompany = companyContacts.map((contact: Contact) => ({
      name: contact.name,
      title: contact.title,
      influence_score: contact.influence_score,
      relationship_strength: contact.relationship_strength,
      mutual_connections: 0 // No mutual connections data available yet
    }));

    return {
      company,
      total_connections: connectionsAtCompany.length,
      connections: connectionsAtCompany,
      best_contact: connectionsAtCompany.sort((a: any, b: any) => (b.influence_score || 0) - (a.influence_score || 0))[0],
      message: generateCompanyAnalysis(company, connectionsAtCompany)
    };
  } catch (error) {
    console.error('Error finding mutual connections:', error);
    return {
      company,
      total_connections: 0,
      connections: [],
      best_contact: null,
      message: `Sorry, I had trouble finding connections at ${company}. Please try again.`
    };
  }
}

function generateCompanyAnalysis(company: string, connections: any[]): string {
  if (connections.length === 0) {
    return `I don't see any direct connections at ${company} in your network. Consider attending industry events or finding mutual connections through LinkedIn.`;
  }

  const bestContact = connections.sort((a, b) => (b.influence_score || 0) - (a.influence_score || 0))[0];
  return `You have ${connections.length} connection${connections.length > 1 ? 's' : ''} at ${company}. Your best contact is ${bestContact.name} (${bestContact.title}) with ${bestContact.influence_score}/100 influence score. They could potentially provide warm introductions to other team members.`;
}

export async function POST(request: NextRequest) {
  try {
    const { type, query, target } = await request.json();

    switch (type) {
      case 'find_path':
        if (!target) {
          return NextResponse.json({ 
            success: false, 
            error: 'Target person required for path finding' 
          });
        }
        
        const path = await findPathToTarget(target);
        return NextResponse.json({
          success: true,
          path,
          message: path ? 
            `Found ${path.degrees}-degree path to ${target.name}. Best approach: ${path.introduction_message}` :
            `Couldn't find a path to ${target.name}. Consider expanding your network or using LinkedIn.`
        });

      case 'analyze_influence':
        if (!target?.name) {
          return NextResponse.json({
            success: false,
            error: 'Person name required for influence analysis'
          });
        }
        
        const influence = await analyzeInfluence(target.name, target.company);
        return NextResponse.json({
          success: true,
          analysis: influence,
          message: influence.message
        });

      case 'company_connections':
        if (!target?.company) {
          return NextResponse.json({
            success: false,
            error: 'Company name required for connection analysis'
          });
        }
        
        const companyAnalysis = await findMutualConnections(target.company);
        return NextResponse.json({
          success: true,
          analysis: companyAnalysis,
          message: companyAnalysis.message
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid relationship intelligence type'
        });
    }
  } catch (error) {
    console.error('Relationship intelligence error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze relationship intelligence'
    });
  }
} 