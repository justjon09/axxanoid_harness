# Axxanoid Harness (Local Multi-Agent OS)

## Conceptual Overview
Axxanoid Harness is a fully local, 100% offline, zero-cost multi-agent operating system designed specifically for Apple Silicon. It operates as a "Human-on-the-loop" factory. The human acts as the CEO, interacting solely with the Chief of Staff (AxxBot). 

The system relies on a TypeScript/Node.js event loop to manage an asynchronous Kanban State Machine (the Workboard). Tasks are broken down, assigned explicit dependencies, and executed headlessly by specialized Python execution workers in isolated environments to guarantee zero context bleed.

## Core Requirements
- **Asynchronous Project Management:** Linear chat is rejected. Work is executed via a localized Workboard tracking `blocked`, `ready`, and `done` states.
- **Sub-Agent Spawning:** Tier 2 leads dynamically spawn isolated Tier 3 workers (e.g., Researchers, Reviewers) to parallelize sub-tasks.
- **Headless Execution:** Background daemons sweep the board and wake workers without human intervention.
- **Content Isolation:** Agents execute only within their specific lanes and communicate strictly through the Kanban board.
- **The Domino Effect:** Completing a parent card automatically unblocks dependent child cards.

## The Workforce
- **AxxBot (Tier 1):** CEO/Traffic Controller. Evaluates intent, creates Workboard cards.
- **Noid (Tier 2):** Lead Coder. Owns architecture, code generation, and debugging.
- **ExecuBot (Tier 2):** OS Delegate. Executes bash commands, triggers Python Grift pipelines, handles file operations.
- **DoBot (Tier 2):** SysAdmin. Maintains harness health, handles system telemetry.
- **PubBot (Tier 2):** Content Lead. Handles web scraping, document generation, and editorial review.

## System Dependencies
- **Hardware:** Mac M4 Pro (24GB Unified Memory)
- **Core Engine:** `llama.cpp` (`llama-server`) running via Homebrew
- **Routing Core:** Node.js / TypeScript (npm)
- **Execution Sandbox:** Python 3 (venv)
- **Models:** 
  - *Head:* `Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf` (Orchestration/Routing)
  - *Hands:* `qwen2.5-coder-14b-instruct-q4_k_m.gguf` (Coding/Execution)