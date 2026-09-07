# Axxanoid Harness (Local Multi-Agent OS)

## Conceptual Overview
Axxanoid OS is a fully local, 100% offline, zero-cost multi-agent operating system designed specifically for Apple Silicon. It operates as a "Human-on-the-loop" factory. The human acts as the CEO, interacting solely with the Chief of Staff (AxxBot), while a fleet of specialized Tier 2 workers asynchronously executes physical commands on the host machine.

The system rejects linear chat and prompt-stuffing. Instead, it relies on a TypeScript/Node.js event loop to manage an asynchronous SQLite Kanban State Machine, detached Python Cron pipelines, and a local ChromaDB vector semantic memory system.

## Core Capabilities
- **Asynchronous Project Management:** Work is executed via a localized Workboard tracking `blocked`, `ready`, and `done` states. A 5-second Orchestrator loop natively resolves dependencies.
- **Long-Term Vector Memory (RAG):** Integrates ChromaDB and a local Nomic embedding model to archive past chats and ingest structural knowledge (Souls, Company Directives), bypassing standard context limits.
- **Headless Pipeline Crons:** Long-running Python processes ("Grifts") run entirely detached from the Node event loop and are managed dynamically via the Web Dashboard.
- **Content Isolation & Translation:** The TS Engine securely proxies outputs from `llama.cpp`, translating raw markdown or unstructured JSON into strict OS tool executions[cite: 14].

## The Workforce
- **AxxBot (Tier 1):** CEO/Traffic Controller. Evaluates intent, creates Workboard cards, triages blocked needs, and searches semantic memory.
- **Noid (Tier 2):** Lead Coder. Owns architecture, code generation, and file manipulation.
- **ExecuBot (Tier 2):** OS Delegate. Executes bash commands, triggers Python pipelines, handles file operations.
- **DoBot (Tier 2):** SysAdmin. Maintains harness health, runs background Heartbeat audits, handles system telemet.
- **PubBot (Tier 2):** Content Lead. Handles web scraping, document generation, and editorial formatting.

---

## Operating Instructions & Extensions

### 1. The CLI Command Center (`npm run axx -- <command>`)
The OS includes a powerful TypeScript CLI for rapid intervention and system diagnostics.

*   **`axx add "Task"`**: Directly inject a top-level task for AxxBot onto the Workboard.
*   **`axx status`**: View the active Kanban board state (Ready, In Progress, Blocked, Done, Failed).
*   **`axx logs [agent]`**: View the latest tool execution payloads and error traces for an agent.
*   **`axx pause` / `axx resume`**: Halt or resume the Orchestrator loop and Heartbeat daemon.
*   **`axx audit`**: Run a diagnostic boot check to ensure agent configurations perfectly match physical Tools and Skills on disk.
*   **`axx toggle <tool|skill> <name> <on|off>`**: Globally enable/disable a tool or skill in `system_control.json`.
*   **`axx memory rebuild <knowledge|archive>`**: Drop and rebuild specific ChromaDB vector collections based on local markdown files.

### 2. How to Add a New Agent
Agents are defined by a strict 3-file structure to prevent context bleed[cite: 14].
Run: `npm run axx -- agent create <name> <tier>`

This instantly scaffolds:
1.  `config.json`: Hardware routing and strict Tool/Skill arrays (e.g., `allowed_tools: ["read_file"]`).
2.  `IDENTITY.md`: UI and high-level role definition.
3.  `SOUL.md`: The cognitive prompt defining boundaries and the Path-to-Success invariant.

### 3. How to Add a New Tool
Tools are physical execution primitives (Node.js/TypeScript).
1.  Create a `.ts` file in `tools/custom/` or `tools/native/`.
2.  Export a `schema` conforming to the `HarnessToolDefinition`.
3.  Export an `execute(payload)` async function.
*Note: To wrap an external Python script or MCP server, use `npm run axx -- tool incorp python <path>` or `npm run axx -- tool incorp mcp <name> <command>`.*

### 4. How to Add a New Skill
Skills are Markdown playbooks instructing agents on *how* to combine tools for complex workflows.
1.  Create a `.md` file in `skills/custom/` or `skills/native/`.
2.  The filename becomes the exact skill ID.
3.  Add the skill ID to the respective agent's `config.json` array.

### 5. How to Add a Cron Pipeline
Crons are long-running, autonomous Python scripts running in `axx_env`.
1.  Place your Python script in `scripts/crons/`.
2.  Open `configs/system_control.json` and add your definition to the `"crons"` object.
3.  Specify `"interval_ms"` and `"enabled"`. It will automatically appear in the Web UI System Controls for toggling and on-demand execution.

## System Dependencies
- **Hardware:** Mac M4 Pro (24GB Unified Memory)
- **Core Engine:** `llama.cpp` (`llama-server`) running via Homebrew
- **Routing Core:** Node.js / TypeScript (npm)
- **Execution Sandbox:** Python 3 (venv)
- **Models:** 
  - *Head:* `Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf` (Orchestration/Routing)
  - *Hands:* `qwen2.5-coder-14b-instruct-q4_k_m.gguf` (Coding/Execution)