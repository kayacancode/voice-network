#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { LinkedInScraper } from './linkedin-scraper.js';
import { NetworkDataProcessor } from './network-processor.js';

dotenv.config();

interface LinkedInConnection {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  profileUrl?: string;
  industry?: string;
  skills?: string[];
  connections?: LinkedInConnection[];
  mutualConnections?: number;
  summary?: string;
}

class LinkedInMCPServer {
  private server: Server;
  private pinecone: Pinecone;
  private openai: OpenAI;
  private scraper: LinkedInScraper;
  private processor: NetworkDataProcessor;

  constructor() {
    this.server = new Server(
      {
        name: 'linkedin-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.scraper = new LinkedInScraper();
    this.processor = new NetworkDataProcessor(this.openai, this.pinecone);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'fetch_linkedin_connections',
          description: 'Fetch your LinkedIn connections and their network data',
          inputSchema: {
            type: 'object',
            properties: {
              includeSecondDegree: {
                type: 'boolean',
                description: 'Whether to fetch second-degree connections',
                default: false,
              },
              maxConnections: {
                type: 'number',
                description: 'Maximum number of connections to fetch',
                default: 500,
              },
              loginEmail: {
                type: 'string',
                description: 'LinkedIn login email (optional if session exists)',
              },
              loginPassword: {
                type: 'string',
                description: 'LinkedIn login password (optional if session exists)',
              },
            },
          },
        },
        {
          name: 'search_network',
          description: 'Search through your LinkedIn network using natural language',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language search query',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 10,
              },
              includeSecondDegree: {
                type: 'boolean',
                description: 'Whether to include second-degree connections in search',
                default: false,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'update_connection_data',
          description: 'Update specific connection data in Pinecone',
          inputSchema: {
            type: 'object',
            properties: {
              connectionId: {
                type: 'string',
                description: 'LinkedIn connection ID to update',
              },
              updateFields: {
                type: 'object',
                description: 'Fields to update for the connection',
              },
            },
            required: ['connectionId', 'updateFields'],
          },
        },
        {
          name: 'get_network_stats',
          description: 'Get statistics about your LinkedIn network in Pinecone',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fetch_linkedin_connections':
            return await this.fetchLinkedInConnections(args);

          case 'search_network':
            return await this.searchNetwork(args);

          case 'update_connection_data':
            return await this.updateConnectionData(args);

          case 'get_network_stats':
            return await this.getNetworkStats();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async fetchLinkedInConnections(args: any) {
    const {
      includeSecondDegree = false,
      maxConnections = 500,
      loginEmail,
      loginPassword,
    } = args;

    try {
      // Initialize scraper session
      if (loginEmail && loginPassword) {
        await this.scraper.login(loginEmail, loginPassword);
      }

      // Fetch first-degree connections
      const connections = await this.scraper.getConnections(maxConnections);
      
      // Optionally fetch second-degree connections
      if (includeSecondDegree) {
        for (const connection of connections.slice(0, Math.min(50, connections.length))) {
          try {
            connection.connections = await this.scraper.getConnectionsOfConnection(
              connection.profileUrl!,
              25
            );
          } catch (error) {
            console.warn(`Failed to fetch connections for ${connection.name}:`, error);
          }
        }
      }

      // Process and store in Pinecone
      const processed = await this.processor.processConnections(connections);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully fetched and processed ${connections.length} LinkedIn connections. ${processed.stored} connections stored in Pinecone.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch LinkedIn connections: ${error}`);
    }
  }

  private async searchNetwork(args: any) {
    const { query, limit = 10, includeSecondDegree = false } = args;

    try {
      const results = await this.processor.searchNetwork(query, {
        limit,
        includeSecondDegree,
      });

      const formattedResults = results.map((result) => ({
        name: result.name,
        title: result.title,
        company: result.company,
        location: result.location,
        score: result.score,
        summary: result.summary,
        profileUrl: result.profileUrl,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Found ${results.length} connections matching "${query}":\n\n${formattedResults
              .map(
                (r, i) =>
                  `${i + 1}. **${r.name}** (${r.score?.toFixed(2)} match)\n   ${r.title}${r.company ? ` at ${r.company}` : ''}\n   ${r.location || ''}\n   ${r.summary || ''}\n`
              )
              .join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search network: ${error}`);
    }
  }

  private async updateConnectionData(args: any) {
    const { connectionId, updateFields } = args;

    try {
      await this.processor.updateConnection(connectionId, updateFields);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully updated connection data for ${connectionId}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update connection data: ${error}`);
    }
  }

  private async getNetworkStats() {
    try {
      const stats = await this.processor.getNetworkStats();
      
      return {
        content: [
          {
            type: 'text',
            text: `Network Statistics:
- Total connections: ${stats.totalConnections}
- Companies represented: ${stats.uniqueCompanies}
- Industries covered: ${stats.uniqueIndustries}
- Locations: ${stats.uniqueLocations}
- Last updated: ${stats.lastUpdated}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get network stats: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LinkedIn MCP server running on stdio');
  }
}

const server = new LinkedInMCPServer();
server.run().catch(console.error); 