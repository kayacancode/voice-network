import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";
import { NetworkDataProcessor } from "../../../mcp-server/src/network-processor";
import { LinkedInScraper } from "../../../mcp-server/src/linkedin-scraper";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const linkedinScraper = new LinkedInScraper();

// Helper function to create NetworkDataProcessor instance
function createNetworkProcessor() {
  return new NetworkDataProcessor(openai as any, pinecone);
}

export async function POST(request: NextRequest) {
  try {
    const { 
      action, 
      query, 
      limit = 10, 
      includeSecondDegree = false,
      maxConnections = 500,
      loginEmail,
      loginPassword
    } = await request.json();

    // Handle different LinkedIn actions
    switch (action) {
      case "fetch_connections":
        return await handleFetchConnections({
          maxConnections,
          includeSecondDegree,
          loginEmail: loginEmail || process.env.LINKEDIN_EMAIL,
          loginPassword: loginPassword || process.env.LINKEDIN_PASSWORD,
        });

      case "search_network":
        return await handleSearchNetwork({ query, limit, includeSecondDegree });

      case "get_stats":
        return await handleGetStats();

      case "update_connection":
        return await handleUpdateConnection(request);

      default:
        // Default to search if no action specified but query provided
        if (query) {
          return await handleSearchNetwork({ query, limit, includeSecondDegree });
        }
        return NextResponse.json(
          { error: "Invalid action or missing query" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in LinkedIn API:", error);
    return NextResponse.json(
      { error: "Failed to process LinkedIn request" },
      { status: 500 }
    );
  }
}

async function handleFetchConnections(params: any) {
  try {
    const { maxConnections, includeSecondDegree, loginEmail, loginPassword } = params;

    if (!loginEmail || !loginPassword) {
      return NextResponse.json(
        { error: "LinkedIn credentials required for fetching connections" },
        { status: 400 }
      );
    }

    // Login to LinkedIn
    await linkedinScraper.login(loginEmail, loginPassword);

    // Fetch connections
    const connections = await linkedinScraper.getConnections(maxConnections);

    // Optionally fetch second-degree connections
    if (includeSecondDegree) {
      const limitedConnections = connections.slice(0, Math.min(50, connections.length));
      for (const connection of limitedConnections) {
        try {
          if (connection.profileUrl) {
            connection.connections = await linkedinScraper.getConnectionsOfConnection(
              connection.profileUrl,
              25
            );
          }
        } catch (error) {
          console.warn(`Failed to fetch second-degree connections for ${connection.name}:`, error);
        }
      }
    }

    // Process and store in Pinecone
    const result = await networkProcessor.processConnections(connections);

    // Close browser
    await linkedinScraper.close();

    return NextResponse.json({
      success: true,
      message: `Successfully fetched and processed ${connections.length} LinkedIn connections`,
      processed: result.processed,
      stored: result.stored,
      totalConnections: connections.length,
    });

  } catch (error) {
    console.error("Error fetching LinkedIn connections:", error);
    await linkedinScraper.close(); // Cleanup on error
    return NextResponse.json(
      { error: `Failed to fetch LinkedIn connections: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

async function handleSearchNetwork(params: any) {
  try {
    const { query, limit, includeSecondDegree } = params;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const results = await networkProcessor.searchNetwork(query, {
      limit,
      includeSecondDegree,
    });

    // Format results to match existing contact format for consistency
    const formattedResults = results.map((person) => ({
      id: person.id,
      name: person.name || "",
      title: person.title || "",
      company: person.company || "",
      location: person.location || "",
      profileUrl: person.profileUrl || "",
      industry: person.industry || "",
      summary: person.summary || "",
      skills: person.skills || [],
      score: person.score || 0,
      source: "linkedin",
      connectionType: person.id.includes('2nd') ? 'second-degree' : 'first-degree',
    }));

    return NextResponse.json({
      success: true,
      results: formattedResults,
      query,
      totalResults: formattedResults.length,
      source: "linkedin",
    });

  } catch (error) {
    console.error("Error searching LinkedIn network:", error);
    return NextResponse.json(
      { error: "Failed to search LinkedIn network" },
      { status: 500 }
    );
  }
}

async function handleGetStats() {
  try {
    const stats = await networkProcessor.getNetworkStats();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalConnections: stats.totalConnections,
        uniqueCompanies: stats.uniqueCompanies,
        uniqueIndustries: stats.uniqueIndustries,
        uniqueLocations: stats.uniqueLocations,
        lastUpdated: stats.lastUpdated,
      },
    });

  } catch (error) {
    console.error("Error getting network stats:", error);
    return NextResponse.json(
      { error: "Failed to get network statistics" },
      { status: 500 }
    );
  }
}

async function handleUpdateConnection(request: NextRequest) {
  try {
    const { connectionId, updateFields } = await request.json();

    if (!connectionId || !updateFields) {
      return NextResponse.json(
        { error: "Connection ID and update fields are required" },
        { status: 400 }
      );
    }

    await networkProcessor.updateConnection(connectionId, updateFields);

    return NextResponse.json({
      success: true,
      message: `Successfully updated connection ${connectionId}`,
    });

  } catch (error) {
    console.error("Error updating connection:", error);
    return NextResponse.json(
      { error: "Failed to update connection" },
      { status: 500 }
    );
  }
} 