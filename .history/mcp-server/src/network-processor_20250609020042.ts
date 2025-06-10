import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { LinkedInConnection } from './linkedin-scraper.js';

interface ProcessedConnection extends LinkedInConnection {
  embedding?: number[];
  lastUpdated?: string;
  tags?: string[];
}

interface SearchResult extends LinkedInConnection {
  score?: number;
}

interface SearchOptions {
  limit?: number;
  includeSecondDegree?: boolean;
  filters?: Record<string, any>;
}

interface NetworkStats {
  totalConnections: number;
  uniqueCompanies: number;
  uniqueIndustries: number;
  uniqueLocations: number;
  lastUpdated: string;
}

export class NetworkDataProcessor {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;

  constructor(openai: OpenAI, pinecone: Pinecone, indexName = 'ai-network') {
    this.openai = openai;
    this.pinecone = pinecone;
    this.indexName = indexName;
  }

  async processConnections(connections: LinkedInConnection[]): Promise<{ processed: number; stored: number }> {
    let processed = 0;
    let stored = 0;

    console.log(`Processing ${connections.length} connections...`);

    const index = this.pinecone.index(this.indexName);

    // Process connections in batches
    const batchSize = 10;
    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize);
      
      try {
        const processedBatch = await Promise.all(
          batch.map(conn => this.processSingleConnection(conn))
        );

        // Prepare vectors for Pinecone
        const vectors = processedBatch
          .filter(conn => conn.embedding)
          .map(conn => ({
            id: `linkedin_${conn.id}`,
            values: conn.embedding!,
            metadata: {
              name: conn.name,
              title: conn.title || '',
              company: conn.company || '',
              location: conn.location || '',
              profileUrl: conn.profileUrl || '',
              industry: conn.industry || '',
              summary: conn.summary || '',
              skills: JSON.stringify(conn.skills || []),
              connectionType: 'first-degree',
              lastUpdated: new Date().toISOString(),
              source: 'linkedin',
            },
          }));

        if (vectors.length > 0) {
          await index.upsert(vectors);
          stored += vectors.length;
        }

        processed += batch.length;
        console.log(`Processed ${processed}/${connections.length} connections`);

      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
      }
    }

    // Process second-degree connections if they exist
    for (const connection of connections) {
      if (connection.connections && connection.connections.length > 0) {
        try {
          const secondDegreeResult = await this.processSecondDegreeConnections(
            connection.connections,
            connection.id
          );
          stored += secondDegreeResult.stored;
        } catch (error) {
          console.error(`Error processing second-degree connections for ${connection.name}:`, error);
        }
      }
    }

    console.log(`Processing complete: ${processed} processed, ${stored} stored in Pinecone`);
    return { processed, stored };
  }

  private async processSingleConnection(connection: LinkedInConnection): Promise<ProcessedConnection> {
    try {
      // Create searchable text from connection data
      const searchableText = this.createSearchableText(connection);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(searchableText);
      
      return {
        ...connection,
        embedding,
        lastUpdated: new Date().toISOString(),
        tags: this.generateTags(connection),
      };
    } catch (error) {
      console.error(`Error processing connection ${connection.name}:`, error);
      return connection;
    }
  }

  private async processSecondDegreeConnections(
    connections: LinkedInConnection[],
    firstDegreeId: string
  ): Promise<{ stored: number }> {
    let stored = 0;
    const index = this.pinecone.index(this.indexName);

    const batchSize = 10;
    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize);
      
      try {
        const processedBatch = await Promise.all(
          batch.map(conn => this.processSingleConnection(conn))
        );

        const vectors = processedBatch
          .filter(conn => conn.embedding)
          .map(conn => ({
            id: `linkedin_2nd_${conn.id}`,
            values: conn.embedding!,
            metadata: {
              name: conn.name,
              title: conn.title || '',
              company: conn.company || '',
              location: conn.location || '',
              profileUrl: conn.profileUrl || '',
              industry: conn.industry || '',
              summary: conn.summary || '',
              skills: JSON.stringify(conn.skills || []),
              connectionType: 'second-degree',
              firstDegreeConnection: firstDegreeId,
              lastUpdated: new Date().toISOString(),
              source: 'linkedin',
            },
          }));

        if (vectors.length > 0) {
          await index.upsert(vectors);
          stored += vectors.length;
        }
      } catch (error) {
        console.error(`Error processing second-degree batch:`, error);
      }
    }

    return { stored };
  }

  private createSearchableText(connection: LinkedInConnection): string {
    const parts = [
      connection.name,
      connection.title,
      connection.company,
      connection.location,
      connection.industry,
      connection.summary,
      ...(connection.skills || []),
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  private generateTags(connection: LinkedInConnection): string[] {
    const tags: string[] = [];

    if (connection.company) {
      tags.push(`company:${connection.company.toLowerCase()}`);
    }
    
    if (connection.location) {
      tags.push(`location:${connection.location.toLowerCase()}`);
    }
    
    if (connection.industry) {
      tags.push(`industry:${connection.industry.toLowerCase()}`);
    }
    
    if (connection.title) {
      // Extract job level indicators
      const title = connection.title.toLowerCase();
      if (title.includes('senior') || title.includes('sr')) tags.push('level:senior');
      if (title.includes('junior') || title.includes('jr')) tags.push('level:junior');
      if (title.includes('manager') || title.includes('lead')) tags.push('level:management');
      if (title.includes('director') || title.includes('vp') || title.includes('ceo')) tags.push('level:executive');
    }

    return tags;
  }

  async searchNetwork(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10, includeSecondDegree = false } = options;

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      const index = this.pinecone.index(this.indexName);
      
      // Prepare filter
      const filter: Record<string, any> = {
        source: 'linkedin',
      };
      
      if (!includeSecondDegree) {
        filter.connectionType = 'first-degree';
      }

      // Search Pinecone
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: limit,
        filter,
        includeMetadata: true,
      });

      // Format results
      const results: SearchResult[] = searchResponse.matches.map(match => ({
        id: match.id.replace('linkedin_', '').replace('linkedin_2nd_', ''),
        name: match.metadata?.name as string,
        title: match.metadata?.title as string,
        company: match.metadata?.company as string,
        location: match.metadata?.location as string,
        profileUrl: match.metadata?.profileUrl as string,
        industry: match.metadata?.industry as string,
        summary: match.metadata?.summary as string,
        skills: match.metadata?.skills ? JSON.parse(match.metadata.skills as string) : [],
        score: match.score,
      }));

      return results;
    } catch (error) {
      console.error('Error searching network:', error);
      throw error;
    }
  }

  async updateConnection(connectionId: string, updateFields: Partial<LinkedInConnection>): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // First, get the existing vector
      const fetchResponse = await index.fetch([`linkedin_${connectionId}`]);
      const existingVector = fetchResponse.vectors[`linkedin_${connectionId}`];
      
      if (!existingVector) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      // Merge existing metadata with updates
      const updatedMetadata = {
        ...existingVector.metadata,
        ...updateFields,
        lastUpdated: new Date().toISOString(),
      };

      // If content changed, regenerate embedding
      let values = existingVector.values;
      if (updateFields.name || updateFields.title || updateFields.summary) {
        const searchableText = this.createSearchableText({
          id: connectionId,
          name: updatedMetadata.name as string,
          title: updatedMetadata.title as string,
          company: updatedMetadata.company as string,
          location: updatedMetadata.location as string,
          industry: updatedMetadata.industry as string,
          summary: updatedMetadata.summary as string,
          skills: updatedMetadata.skills ? JSON.parse(updatedMetadata.skills as string) : [],
        });
        
        values = await this.generateEmbedding(searchableText);
      }

      // Update in Pinecone
      await index.upsert([{
        id: `linkedin_${connectionId}`,
        values,
        metadata: updatedMetadata,
      }]);

      console.log(`Successfully updated connection ${connectionId}`);
    } catch (error) {
      console.error(`Error updating connection ${connectionId}:`, error);
      throw error;
    }
  }

  async getNetworkStats(): Promise<NetworkStats> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Get index stats
      const stats = await index.describeIndexStats();
      
      // Query for unique companies, industries, locations
      // Note: This is a simplified approach - for large datasets, you'd want to use aggregation
      const sampleQuery = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 1000,
        filter: { source: 'linkedin', connectionType: 'first-degree' },
        includeMetadata: true,
      });

      const companies = new Set<string>();
      const industries = new Set<string>();
      const locations = new Set<string>();
      let lastUpdated = '';

      sampleQuery.matches.forEach(match => {
        if (match.metadata?.company) companies.add(match.metadata.company as string);
        if (match.metadata?.industry) industries.add(match.metadata.industry as string);
        if (match.metadata?.location) locations.add(match.metadata.location as string);
        if (match.metadata?.lastUpdated && match.metadata.lastUpdated > lastUpdated) {
          lastUpdated = match.metadata.lastUpdated as string;
        }
      });

      return {
        totalConnections: stats.totalVectorCount || 0,
        uniqueCompanies: companies.size,
        uniqueIndustries: industries.size,
        uniqueLocations: locations.size,
        lastUpdated: lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting network stats:', error);
      throw error;
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(`linkedin_${connectionId}`);
      console.log(`Successfully deleted connection ${connectionId}`);
    } catch (error) {
      console.error(`Error deleting connection ${connectionId}:`, error);
      throw error;
    }
  }
} 