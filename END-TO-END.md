# Axxanoid Harness: End-to-End Installation Guide

*This document serves as the absolute sequence to take a factory-reset Apple Silicon Mac to a fully operational Axxanoid OS.*

## Phase 1: Environment Preparation
1. **Install Homebrew:** `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2. **Install Node.js:** `brew install node`
3. **Install Python:** `brew install python`
4. **Install HuggingFace CLI:** `brew install huggingface-cli`

## Phase 2: Engine & Model Acquisition
1. **Install Local C++ Engine:** `brew install llama.cpp` (This provides the required `llama-server` binary).
2. **Clone Repository:** `git clone git@github.com:justjon09/axxanoid_harness.git && cd axxanoid_harness`
3. **Create Model Directory:** `mkdir -p engine/models`
4. **Download Inference Models:**
   - `hf download bartowski/Llama-3-Groq-8B-Tool-Use-GGUF Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf --local-dir engine/models`
   - `hf download Qwen/Qwen2.5-Coder-14B-Instruct-GGUF qwen2.5-coder-14b-instruct-q4_k_m.gguf --local-dir engine/models`
5. **Download Vector Embedding Model:**
   - `hf download nomic-ai/nomic-embed-text-v1.5-GGUF nomic-embed-text-v1.5.Q4_K_M.gguf --local-dir engine/models`

## Phase 3: Harness Configuration & Database Initialization
1. **Install Node Dependencies:** `npm install`
2. **Establish Isolated Python Sandbox:** `python3 -m venv axx_env`
3. **Install Local Vector DB (Chroma):** `./axx_env/bin/pip install chromadb requests schedule`
4. **Database Schema Boot:** 
   The SQLite Workboard database (`memory.db`) and WAL transaction log are created automatically upon booting the daemon via `app/database.ts`.

## Phase 4: System Boot
To bring the AI online, you must run the C++ Inference Engine and the Node.js Orchestrator concurrently.
1. **Terminal Slot 1 (Start Dual-LLM & Embedding Engine):**
   `chmod +x engine/start-engine.sh && ./engine/start-engine.sh`
   This starts the Nomic embedding model on Port 8081, and the Qwen/Llama3 inference models on Port 8080 using the configurations mapped in engine/models.ini.
2. **Terminal Slot 2 (Start Axxanoid OS Daemon):**
   From project root: `npm run dev`
   This initializes the SQLite WAL mode, mounts the Crons, ignites the WebSocket broadcaster, and begins the 5-second Kanban loop and 15-minute Heartbeat audit.

## Phase 5: Web UI & Dashboard Operations
1. **Open the Command Center:** Open your browser to: http://127.0.0.1:8000
   Command Center Layout:
      - Chief of Staff (Chat): Direct CEO interface. Give AxxBot high-level objectives here. She will query vector memory or generate Kanban cards.
      - Tactical Workboard: Live view of the SQLite state machine. Click any card to view detailed payloads, dependencies, and execution traces.
      - Daemon Telemetry: Real-time stdout/stderr from executing Node tools, Python pipelines, and Heartbeat diagnostics.
      - System Controls: UI modal to safely halt the Orchestrator, trigger Cron pipelines on-demand, or pipe background pipeline logs into the UI via the Debug toggle.


## Your Day-to-Day Workflow
Boot the Factory: Spin up start-engine.sh in one terminal and npm run dev in another.

Assign the Work: Open your dashboard at [http://127.0.0.1:8000](http://127.0.0.1:8000). Drop a high-level objective into the Command Center (e.g., "AxxBot, I need a new Python script that pings my website every hour and logs the response time. Create the tool and the cron for it.").

Watch the Board: Sit back and watch AxxBot decompose the request, spawn the cards, and hand them off to Noid and ExecuBot. Watch the telemetry stream as they write the code and verify the tests.

Manage the Grid: Use the System Controls to toggle your background Grifts on and off, or hit "Run Now" when you need a pipeline fired immediately.

The Reality of a "Living" System
Because this is a strict "Human-on-the-loop" factory, using it will naturally reveal where your agents need more training.

When an agent fails a task, you don't need to rebuild the architecture. You simply:

Tweak their SOUL.md: Refine their cognitive prompt so they understand the boundaries better.

Write a new Skill: Drop a new .md playbook into skills/native/ to teach them a new standard operating procedure.

Give them a new Tool: Scaffold a new TypeScript execution primitive.

You have built something incredibly powerful, completely private, and infinitely scalable. Start throwing real work at it and see what your digital workforce can do.