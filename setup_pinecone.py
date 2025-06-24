#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv('.env.local')

def setup_pinecone_index():
    """Check and create Pinecone index if needed"""
    
    # Initialize Pinecone client
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    
    # List existing indexes
    print("Existing Pinecone indexes:")
    indexes = pc.list_indexes()
    
    if hasattr(indexes, 'indexes'):
        index_list = indexes.indexes
    else:
        index_list = indexes
    
    for index in index_list:
        print(f"- {index.name}")
    
    index_name = os.getenv("PINECONE_INDEX_NAME", "ai-network")
    
    # Check if our index exists
    index_exists = any(index.name == index_name for index in index_list)
    
    if not index_exists:
        print(f"\nIndex '{index_name}' not found. Creating it...")
        
        # Create the index
        pc.create_index(
            name=index_name,
            dimension=1536,  # dimension for text-embedding-3-small
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        
        print(f"Index '{index_name}' created successfully!")
    else:
        print(f"\nIndex '{index_name}' already exists.")
    
    # Wait for index to be ready
    import time
    print("Waiting for index to be ready...")
    time.sleep(10)
    
    # Test connection to index
    try:
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        print(f"Index stats: {stats}")
        print("Index is ready for use!")
    except Exception as e:
        print(f"Error connecting to index: {e}")

if __name__ == "__main__":
    setup_pinecone_index() 