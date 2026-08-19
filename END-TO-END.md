# Axxanoid Harness: End-to-End Installation Guide

*This document serves as the absolute sequence to take a factory-reset Apple Silicon Mac to a fully operational Axxanoid OS.*

## Phase 1: Environment Preparation
1. Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2. Install Node.js: `brew install node`
3. Install Python: `brew install python`
4. Install HuggingFace CLI: `brew install huggingface-cli`

## Phase 2: Engine & Model Acquisition
1. Install Engine: `brew install llama.cpp` (This provides the required `llama-server` binary).
2. Create Model Directory: `mkdir -p AXXANOID_HARNES/engine/models`
3. Download Models:
   - `hf download bartowski/Llama-3-Groq-8B-Tool-Use-GGUF Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf --local-dir AXXANOID_HARNES/engine/models`
   - `hf download Qwen/Qwen2.5-Coder-14B-Instruct-GGUF qwen2.5-coder-14b-instruct-q4_k_m.gguf --local-dir AXXANOID_HARNES/engine/models`

## Phase 3: Harness Configuration & Database Initialization
1. Clone Repository & Navigate:
   `git clone git@github.com:justjon09/axxanoid_harness.git && cd axxanoid_harness`
2. Install Node Dependencies:
   `npm install`
3. Install Database & Types:
   `npm install better-sqlite3 && npm install --save-dev @types/better-sqlite3`
4. Establish Isolated Python Sandbox:
   `python3 -m venv axx_env`
5. Database Schema Boot:
   The SQLite Workboard database (`memory.db`) and WAL transaction log (`memory.db-wal`) are created and configured in WAL mode automatically upon booting the daemon via `app/database.ts`.

## Phase 4: System Boot
1. Terminal Slot 1 (Start LLM Engine):
   `chmod +x engine/start-engine.sh && ./engine/start-engine.sh`
2. Terminal Slot 2 (Start Axxanoid OS Daemon):
   `npm run dev`

## Phase 5: Select or configure agents 
*(To be updated as we build...)*

## Phase 6: Terminal interaction
*(To be updated as we build...)*

## Phase 7: UI interaction 
*(To be updated as we build...)*

## Phase 8: UI and CLI controls 
*(To be updated as we build...)*