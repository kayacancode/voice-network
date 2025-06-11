#!/usr/bin/env python3
"""
Test script for the voice-driven memory capture and retrieval system.
This script validates the memory capture and recall APIs.
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any

# Test configuration
API_BASE_URL = "http://localhost:3000"
CAPTURE_ENDPOINT = f"{API_BASE_URL}/api/capture-memory"
RECALL_ENDPOINT = f"{API_BASE_URL}/api/recall-memory"

# Test data: various ways people might describe meeting someone
TEST_MEMORIES = [
    "I met Sarah today, she works at Google as a software engineer",
    "Just talked to John Smith, he's a product manager at Microsoft",
    "Maria from the conference is a UX designer at Apple",
    "Met David at the networking event, he's the CEO of a startup called TechFlow",
    "Emily mentioned she's a data scientist at Netflix working on recommendation algorithms",
    "Had coffee with Alex Rodriguez, he's a DevOps engineer at Amazon",
    "Spoke with Dr. Lisa Chen, she's a research scientist at Stanford focusing on AI ethics"
]

# Test queries for recall
TEST_QUERIES = [
    "Where does Sarah work?",
    "What does John do?",
    "Tell me about Maria",
    "What do I know about David?",
    "Who works at Netflix?",
    "What does Alex do at Amazon?",
    "Who is the research scientist?"
]

async def capture_memory(text: str) -> Dict[str, Any]:
    """Capture a memory using the API."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                CAPTURE_ENDPOINT,
                json={'text': text, 'userId': 'test-user'},
                headers={'Content-Type': 'application/json'}
            ) as response:
                return await response.json()
    except Exception as e:
        return {'success': False, 'error': str(e)}

async def recall_memory(query: str) -> Dict[str, Any]:
    """Recall a memory using the API."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                RECALL_ENDPOINT,
                json={'query': query, 'userId': 'test-user'},
                headers={'Content-Type': 'application/json'}
            ) as response:
                return await response.json()
    except Exception as e:
        return {'success': False, 'error': str(e)}

async def test_memory_capture():
    """Test memory capture functionality."""
    print("🧠 Testing Memory Capture")
    print("=" * 50)
    
    successful_captures = 0
    
    for i, memory_text in enumerate(TEST_MEMORIES, 1):
        print(f"\n{i}. Capturing: \"{memory_text}\"")
        
        result = await capture_memory(memory_text)
        
        if result.get('success'):
            person = result.get('person', 'Unknown')
            details = result.get('details', 'No details')
            confidence = result.get('confidence', 0)
            print(f"   ✅ SUCCESS: {person} - {details} (confidence: {confidence:.2f})")
            print(f"   🔊 Voice feedback: \"{result.get('confirmationMessage', '')}\"")
            successful_captures += 1
        else:
            print(f"   ❌ FAILED: {result.get('message', 'Unknown error')}")
            if 'confidence' in result:
                print(f"   📊 Confidence: {result['confidence']:.2f}")
    
    print(f"\n📈 Capture Results: {successful_captures}/{len(TEST_MEMORIES)} successful")
    return successful_captures

async def test_memory_recall():
    """Test memory recall functionality."""
    print("\n\n🔍 Testing Memory Recall")
    print("=" * 50)
    
    successful_recalls = 0
    
    for i, query in enumerate(TEST_QUERIES, 1):
        print(f"\n{i}. Query: \"{query}\"")
        
        result = await recall_memory(query)
        
        if result.get('success'):
            message = result.get('message', 'No message')
            person = result.get('person', '')
            details = result.get('details', '')
            print(f"   ✅ FOUND: {message}")
            if person and details:
                print(f"   👤 Person: {person}")
                print(f"   📝 Details: {details}")
            print(f"   🔊 Voice response: \"{result.get('ssml', '').replace('<speak>', '').replace('</speak>', '')}\"")
            successful_recalls += 1
        else:
            print(f"   ❌ NOT FOUND: {result.get('message', 'No memories found')}")
    
    print(f"\n📈 Recall Results: {successful_recalls}/{len(TEST_QUERIES)} successful")
    return successful_recalls

async def test_edge_cases():
    """Test edge cases and error conditions."""
    print("\n\n🧪 Testing Edge Cases")
    print("=" * 50)
    
    edge_cases = [
        ("", "Empty text"),
        ("Hello", "Too short"),
        ("I like pizza", "No person mentioned"),
        ("The meeting was great today", "Vague content"),
        ("She works at Google", "No name mentioned")
    ]
    
    for text, description in edge_cases:
        print(f"\n🔬 Testing: {description} - \"{text}\"")
        result = await capture_memory(text)
        
        if result.get('success'):
            print(f"   ⚠️  Unexpected success: {result.get('confirmationMessage', '')}")
        else:
            print(f"   ✅ Correctly rejected: {result.get('message', 'No message')}")

async def test_recall_accuracy():
    """Test recall accuracy with specific queries."""
    print("\n\n🎯 Testing Recall Accuracy")
    print("=" * 50)
    
    # Test specific person queries
    accuracy_tests = [
        ("Sarah", "Google"),
        ("John", "Microsoft"),
        ("Maria", "Apple"),
        ("David", "CEO"),
        ("Emily", "Netflix"),
        ("Alex", "Amazon"),
        ("Lisa", "Stanford")
    ]
    
    accurate_recalls = 0
    
    for person, expected_keyword in accuracy_tests:
        query = f"What do you know about {person}?"
        print(f"\n🔍 Query: \"{query}\"")
        
        result = await recall_memory(query)
        
        if result.get('success'):
            message = result.get('message', '').lower()
            if expected_keyword.lower() in message:
                print(f"   ✅ ACCURATE: Found '{expected_keyword}' in response")
                print(f"   💬 Response: {result.get('message', '')}")
                accurate_recalls += 1
            else:
                print(f"   ⚠️  INACCURATE: Expected '{expected_keyword}' but got:")
                print(f"   💬 Response: {result.get('message', '')}")
        else:
            print(f"   ❌ NO RECALL: {result.get('message', '')}")
    
    accuracy_rate = (accurate_recalls / len(accuracy_tests)) * 100
    print(f"\n📊 Accuracy Rate: {accuracy_rate:.1f}% ({accurate_recalls}/{len(accuracy_tests)})")
    
    return accuracy_rate

async def main():
    """Run all tests."""
    print("🚀 Voice-Driven Memory System Test Suite")
    print("=" * 60)
    
    try:
        # Test memory capture
        captures = await test_memory_capture()
        
        # Wait a moment for indexing
        print("\n⏳ Waiting for Pinecone indexing...")
        await asyncio.sleep(2)
        
        # Test memory recall
        recalls = await test_memory_recall()
        
        # Test edge cases
        await test_edge_cases()
        
        # Test accuracy
        accuracy = await test_recall_accuracy()
        
        # Final report
        print("\n\n📋 FINAL REPORT")
        print("=" * 60)
        print(f"✅ Memory Captures: {captures}/{len(TEST_MEMORIES)} ({(captures/len(TEST_MEMORIES)*100):.1f}%)")
        print(f"🔍 Memory Recalls: {recalls}/{len(TEST_QUERIES)} ({(recalls/len(TEST_QUERIES)*100):.1f}%)")
        print(f"🎯 Recall Accuracy: {accuracy:.1f}%")
        
        # Goal assessment
        if accuracy >= 80:
            print("\n🎉 SUCCESS: ≥80% recall accuracy achieved!")
        else:
            print(f"\n⚠️  IMPROVEMENT NEEDED: {accuracy:.1f}% < 80% target accuracy")
        
        if captures >= len(TEST_MEMORIES) * 0.8:
            print("✅ Memory capture working well")
        else:
            print("⚠️  Memory capture needs improvement")
            
    except Exception as e:
        print(f"\n💥 TEST SUITE ERROR: {str(e)}")
        print("Make sure the Next.js server is running on localhost:3000")

if __name__ == "__main__":
    asyncio.run(main()) 