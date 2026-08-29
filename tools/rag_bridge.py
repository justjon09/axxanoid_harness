import sys
import json
import requests
import chromadb
import os
import hashlib

# Absolute pathing for the local vector database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, '..', 'memory', 'vector_db')
os.makedirs(DB_DIR, exist_ok=True)

# Disable ChromaDB telemetry to keep it 100% offline
client = chromadb.PersistentClient(path=DB_DIR, settings=chromadb.Settings(anonymized_telemetry=False))
LLAMA_URL = "http://127.0.0.1:8080/v1/embeddings"

def get_embedding(text):
    res = requests.post(
        LLAMA_URL,
        json={
            "input": text,
            "model": "nomic-embed-text"
        }
    )
    res.raise_for_status()
    return res.json()['data'][0]['embedding']

def chunk_text(text, chunk_size=1000):
    # Fast, simple chunking for RAG ingestion
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

def main():
    mode = sys.argv[1]
    payload = json.loads(sys.argv[2])
    collection_name = payload.get("collection", "default")
    
    # Handle targeted collection resets for the CLI rebuild commands
    if mode == "reset":
        try:
            client.delete_collection(name=collection_name)
            print(json.dumps({"success": True, "output": f"Collection '{collection_name}' successfully deleted/reset."}))
        except Exception:
            print(json.dumps({"success": True, "output": f"Collection '{collection_name}' did not exist. Nothing to reset."}))
        return

    collection = client.get_or_create_collection(name=collection_name)

    if mode == "ingest":
        text = payload["text"]
        source = payload.get("source", "unknown_source")
        chunks = chunk_text(text)
        
        docs, embeddings, metas, ids = [], [], [], []
        for i, chunk in enumerate(chunks):
            # Create a unique, deterministic ID for this exact text chunk
            doc_id = hashlib.md5(f"{source}_{i}_{chunk}".encode()).hexdigest()
            docs.append(chunk)
            embeddings.append(get_embedding(chunk))
            metas.append({"source": source, "chunk": i})
            ids.append(doc_id)
            
        if docs:
            collection.upsert(documents=docs, embeddings=embeddings, metadatas=metas, ids=ids)
            
        print(json.dumps({"success": True, "output": f"Ingested {len(chunks)} chunks from {source} into {collection_name}"}))

    elif mode == "search":
        query = payload["query"]
        n_results = payload.get("limit", 3)
        
        embedding = get_embedding(query)
        results = collection.query(query_embeddings=[embedding], n_results=n_results)
        
        docs = results['documents'][0] if results['documents'] else []
        metas = results['metadatas'][0] if results['metadatas'] else []
        out = [{"source": m.get("source", "unknown"), "content": d} for d, m in zip(docs, metas)]
            
        print(json.dumps({"success": True, "output": json.dumps(out, indent=2)}))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)