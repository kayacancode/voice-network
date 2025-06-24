#!/usr/bin/env python3
import pandas as pd
import os
from dotenv import load_dotenv
from pinecone import Pinecone
import openai as openai_client
from tqdm import tqdm
import time

# Load environment variables
load_dotenv('.env.local')

def upload_linkedin_connections():
    """Upload LinkedIn connections from CSV to Pinecone"""
    
    # Initialize clients
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "ai-network"))
    
    openai_sync = openai_client.OpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Read CSV file
    print("Reading CSV file...")
    df = pd.read_csv('sample-data/Connections.csv')
    
    print(f"Found {len(df)} connections in CSV")
    print("CSV columns:", df.columns.tolist())
    
    # Process and upload each connection
    vectors_to_upsert = []
    batch_size = 100
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Processing connections"):
        try:
            # Extract data from CSV
            first_name = str(row.get('First Name', '')).strip()
            last_name = str(row.get('Last Name', '')).strip()
            company = str(row.get('Company', '')).strip()
            position = str(row.get('Position', '')).strip()
            url = str(row.get('URL', '')).strip()
            email = str(row.get('Email Address', '')).strip()
            connected_on = str(row.get('Connected On', '')).strip()
            
            # Skip if no name
            if not first_name and not last_name:
                continue
                
            # Combine names
            name = f"{first_name} {last_name}".strip()
            
            # Create text for embedding
            text_parts = [name]
            if position:
                text_parts.append(position)
            if company:
                text_parts.append(f"at {company}")
                
            text_for_embedding = " ".join(text_parts)
            
            # Generate embedding
            try:
                emb_resp = openai_sync.embeddings.create(
                    model="text-embedding-3-small", 
                    input=text_for_embedding
                )
                embedding = emb_resp.data[0].embedding
            except Exception as e:
                print(f"Error generating embedding for {name}: {e}")
                continue
            
            # Prepare metadata
            metadata = {
                "name": name,
                "title": position if position != 'nan' else "",
                "company": company if company != 'nan' else "",
                "location": "",  # Not in CSV, could be extracted from other sources
                "industry": "",  # Not in CSV, could be inferred from company
                "linkedin_url": url if url != 'nan' else "",
                "email": email if email != 'nan' else "",
                "connected_on": connected_on if connected_on != 'nan' else "",
                "type": "linkedin"
            }
            
            # Create vector for upsert
            vector_id = f"linkedin_{idx}"
            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding,
                "metadata": metadata
            })
            
            # Upsert in batches
            if len(vectors_to_upsert) >= batch_size:
                print(f"Upserting batch of {len(vectors_to_upsert)} vectors...")
                index.upsert(vectors=vectors_to_upsert)
                vectors_to_upsert = []
                time.sleep(0.1)  # Small delay to avoid rate limits
                
        except Exception as e:
            print(f"Error processing row {idx}: {e}")
            continue
    
    # Upsert remaining vectors
    if vectors_to_upsert:
        print(f"Upserting final batch of {len(vectors_to_upsert)} vectors...")
        index.upsert(vectors=vectors_to_upsert)
    
    print("Upload complete!")
    
    # Test the upload
    print("\nTesting search...")
    test_query = "engineer"
    emb_resp = openai_sync.embeddings.create(
        model="text-embedding-3-small", 
        input=test_query
    )
    test_embedding = emb_resp.data[0].embedding
    
    results = index.query(
        vector=test_embedding,
        top_k=5,
        include_metadata=True
    )
    
    print(f"Search results for '{test_query}':")
    for match in results.matches:
        metadata = match.metadata
        print(f"- {metadata.get('name', 'N/A')} | {metadata.get('title', 'N/A')} | {metadata.get('company', 'N/A')} | Score: {match.score:.3f}")

if __name__ == "__main__":
    upload_linkedin_connections() 