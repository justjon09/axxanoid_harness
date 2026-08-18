import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.rest_routes import router as rest_router

# Import your heartbeat logic (Assuming it's in the root dir or a module)
# Note: If run_heartbeat is synchronous, we run it in a thread so it doesn't block the AP
from q_heartbeat import run_heartbeat

async def heartbeat_loop():
    while True:
        # Wait 15 minutes (900 seconds) before the first pulse
        await asyncio.sleep(900)

        # Run the heartbeat. asyncio.to_thread prevents it from freezing FastAPI
        print("\n>>> [SYSTEM] Triggering 15-Minute Heartbeat...")
        await asyncio.to_thread(run_heartbeat)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages startup and shutdown events for the entire OS."""
    print(">>> [SYSTEM] Waking Q. Initializing background heartbeat...")
    # Spawn the heartbeat loop in the background
    heartbeat_task = asyncio.create_task(heartbeat_loop())
    try:
        yield
    finally:
        # When you hit Ctrl+C to kill the server:
        print(">>> [SYSTEM] Putting Q to sleep. Terminating heartbeat...")
        heartbeat_task.cancel()

# Initialize the master application with the lifespan manager
app = FastAPI(title="Axxanoid OS: Project Q", version="0.1.0", lifespan=lifespan)

# Critical: Allow the local React UI (typically port 5173 or 3000) to communicate with this backend
# allow_origins=["http://localhost:5173", "http://localhost:3000"],
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # We will lock this down to localhost specifically in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the API routes
app.include_router(rest_router, prefix="/api", tags=["api"])

@app.get("/")
def root_check():
    return {"message": "Q-Deamon is availible"}

if __name__ == "__main__":
    print(">>> Booting Axxanoid Harness ....")
    # Run the server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)