## Axxanoid Harness: Master Build Outline

### Phase 1: Engine, DB & Core Lifespan (COMPLETED)
* [x] **Step 1:** Scaffold physical directory structure (`.AXXANOID_HARNES/{app,axx_env,configs,agents,tools,skills,engine,api,channels}`).
* [x] **Step 2:** Initialize TypeScript foundation (`package.json`, `tsconfig.json`, `express`, `better-sqlite3`).
* [x] **Step 3:** Establish isolated Python execution sandbox (`axx_env`).
* [x] **Step 4:** Dual-model engine lock-in (`engine/models.ini` & `engine/start-engine.sh` using relative GGUF model paths).
* [x] **Step 5a:** Shared SQLite Workboard schema initialized in WAL mode (`app/database.ts` with `workboard_cards` and `card_dependencies`).

---

### Phase 2: State Machine & Translation Layer
* [ ] **Step 5b:** Write Task Dispatch Orchestrator (`app/orchestrator.ts`)
* Periodic polling loop for `ready` cards.
* Dependency resolution (automatically converting `blocked` cards to `ready` when parent cards hit `done`).
* Asynchronous worker dispatch to prevent context bleed.
* [ ] **Step 5c:** Wire Orchestrator to Express Lifecycle (`app/main.ts`).
* [ ] **Step 6:** Engine Client & Schema Translation Layer (`engine/llama-client.ts` & `engine/translator.ts`)
* HTTP client targeting `llama-server` on port `8080`.
* Router mapping: Directing AxxBot requests to `Llama-3-Groq-8B` and worker requests to `Qwen2.5-Coder-14B`.
* Response interceptor: Normalizing output so markdown or plain text tool definitions are cleanly converted into standard `tool_calls` payloads.

---

### Phase 3: Workforce Definitions & Permission Scoping
* [ ] **Step 7:** Agent Personas & Lane Contracts (`agents/`)
* Create agent directories: `axxbot/`, `noid/`, `execubot/`, `dobot/`, `pubbot/`.
* Scaffolding per-agent directive files: `SOUL.md`, `IDENTITY.md`, `CAPABILITIES.md`, `WORKSPACE/`.
* **Permission Contracts (`contracts.json` per agent):**
* *AxxBot (Tier 1 Chief of Staff):* Granted read access to user files/documents for intent parsing. Denied shell execution (`terminal:exec`).
* *Noid (Tier 2 Coder):* Restricted strictly to the project codebase directory. Denied system configuration edits.
* *ExecuBot (Tier 2 OS Delegate):* Terminal execution enabled inside `axx_env`. Denied Workboard card creation.
* *DoBot (Tier 2 SysAdmin):* System telemetry & skill management only.

---

### Phase 4: Standardized Skills & Tools Framework
* [ ] **Step 8:** Skill Schema & Tool Execution Pipeline (`skills/` & `tools/`)
* **Skill Template Standard (`skills/template.json` / `SKILL.md`):** Uniform structure defining name, description, required parameters, and execution environment (TS vs Python).
* Open-Source Tool Adapter: Standardized JSON interface allowing external open-source skills to plug directly into the harness without re-engineering.
* Secure Execution Wrapper (`tools/executor.ts`):
* TypeScript bridge executing Python tools inside `.AXXANOID_HARNES/axx_env/bin/python` via `child_process.spawn`.
* Standardized `stdout`/`stderr` logging back to `workboard_cards.result_payload`.

---

### Phase 5: CLI Controls & Interactive Terminal
* [ ] **Step 9:** CLI Channel Interface (`channels/cli.ts`)
* Interactive terminal client for the CEO.
* Direct prompt entry to spawn top-level Workboard cards through AxxBot.
* CLI control commands:
* `axx status` — View active, blocked, and completed Workboard cards.
* `axx pause` / `axx resume` — Emergency halt on the orchestrator event loop.
* `axx logs [agent]` — Stream real-time agent output.

---

### Phase 6: Web UI, Dashboard & Cron Controls
* [ ] **Step 10a:** REST & WebSocket API Routes (`api/`)
* Kanban board CRUD endpoints (`GET/POST /api/cards`, `PUT /api/cards/:id/status`).
* Real-time WebSocket event broadcaster (`channels/web/ws-server.ts`) to push card updates and agent thought logs to the browser.
* [ ] **Step 10b:** Web Dashboard Frontend (`channels/web/public/`)
* Visual Kanban board interface showing real-time card transitions (`ready` -> `in_progress` -> `done`).
* **Cron & Heartbeat Control Panel:** UI toggle for background heartbeat loops, frequency sliders, and audit script toggles.
* **Permissions & Directives Viewer:** UI interface to view active contracts, edit `SOUL.md` / `HUMAN.md` directives, and manage file read permissions for AxxBot.

---

### Phase 7: Validation & End-to-End Factory Verification
* [ ] **Step 11:** Full System Assembly & Playbook Finalization
* Multi-agent dependency chain test (AxxBot creates card -> Noid writes code -> ExecuBot executes -> AxxBot reports final output).
* Verify zero-cost, 100% offline execution on Apple Silicon Metal.
* Update `END-TO-END.md` and `README.md` with final production commands.

## END Axxanoid Harness: Master Build Outline

### Axxanoid Harness: Architecture Map

**1. `AXXANOID_HARNES/app/` (The Core Loop)**
* **What goes here:** The main execution loop, task queuing, and the heartbeat daemon.
* **Mapped from Codeman:** `src/main.ts`, `src/orchestrator-loop.ts`, `src/daemon-control.ts`, `src/task-queue.ts`.
* **Function:** This is the CEO's brainstem. It runs the continuous `while` loop that sweeps the workboard and spawns background tasks, entirely decoupled from the models.

**2. `AXXANOID_HARNES/engine/` (The Translation Layer)**
* **What goes here:** Model client setup, specific parsing logic, and proxy routing.
* **Mapped from Codeman:** `src/utils/opencode-cli-resolver.ts`, `src/utils/claude-cli-resolver.ts`, `src/mux-factory.ts`.
* **Function:** **This is where we solve our 10-day nightmare.** This folder's sole job is to translate the generic JSON outputs from `llama.cpp` (Port 8080) into standard tool calls. If Qwen hallucinates a markdown block, this engine intercepts it, formats it perfectly, and hands it to the `app/` layer.

**3. `AXXANOID_HARNES/agents/` (The Personas & Workspaces)**
* **What goes here:** The explicit definitions and isolated sandboxes for your workforce.
* **Mapped from Codeman:** `AGENTS.md`, `src/templates/` (and the logic for parsing `SOUL.md`/`IDENTITY.md`).
* **Function:** This holds the dedicated directories for `axxbot/`, `noid/`, `execubot/`, `dobot/`, and `pubbot/`. Their memory databases and lane contracts live strictly here.

**4. `AXXANOID_HARNES/axx_env/` (The Python Engine Room)**
* **What goes here:** Your isolated Python virtual environment.
* **Function:** Because `Codeman` is a Node.js framework, we use `axx_env` to sandbox your actual Python execution. When Noid writes a script or ExecuBot runs `master_cron.py` (the Stoner Grifts), it is executed explicitly inside this secure `axx_env` context.

**5. `AXXANOID_HARNES/tools/` & `AXXANOID_HARNES/skills/`**
* **What goes here:** The physical execution scripts and skill definitions.
* **Mapped from Codeman:** `skills/codeman/`, `src/bash-tool-parser.ts`, `src/file-stream-manager.ts`.
* **Function:** Hardcoded, specific capabilities. `tools/` holds the raw execution logic (like a `healthcheck.py` script), while `skills/` holds the Markdown/JSON schemas that tell the AI *how* to use the tool.

**6. `AXXANOID_HARNES/channels/` (The Input/Output)**
* **What goes here:** Web interface, CLI, voice inputs, and external API webhooks.
* **Mapped from Codeman:** `src/web/public/` (UI/CSS/JS), `src/cli.ts`, `src/web/voice-stream.ts`.
* **Function:** The front-end. It takes your chat input or a webhook, formats it into a standard intent, and passes it to `app/`. If the UI crashes, the `app/` and `engine/` keep running natively in the background.

**7. `AXXANOID_HARNES/configs/` & `AXXANOID_HARNES/api/`**
* **What goes here:** System-wide rules, networking, and internal routing.
* **Mapped from Codeman:** `src/config/`, `src/web/routes/`.
* **Function:** Manages the ports (like `18789` for the UI), token authentication, max concurrency limits, and REST endpoints for your agents to talk to each other.

### END Axxanoid Harness: Architecture Map

### Axxanoid Harness: Build concepts and discoveries
---
By stripping the Codeman source code down to its purest parts and rebuilding it into the Axxanoid Harness, you get an enterprise-grade async router that you control 100%.

The TS-to-Python Bridge (How it will work)
Before we write a line of code, we need to establish the contract between the Head (TypeScript) and the Hands (Python).

The TypeScript Orchestrator (app/ and engine/) maintains the continuous event loop, handles the Web UI/WebSockets, manages the Workboard state, and talks to llama.cpp on port 8080.

The Execution: When the TS engine determines that Noid needs to run a Python script or ExecuBot needs to hit the terminal, it doesn't try to execute it in Node.js. It uses Node's native child_process.spawn.

The Handoff: The TS core explicitly calls your isolated Python environment:
spawn('AXXANOID_HARNES/axx_env/bin/python', ['tools/master_cron.py', ...args]).

The Return: The TS core listens to the stdout (standard output) of that Python script, captures the result, and posts it back to the Kanban board.
---
To make the translation layer universally extensible, its architecture must decouple schema ingestion from model-specific prompt rendering. This design allows open-source standards—such as OpenAI function calling schemas or Model Context Protocol (MCP) tool definitions—to plug in seamlessly alongside local harness skills without modifying core agent logic.

Modular Translation Layer Architecture

1. Inbound Ingestion Layer (Universal Schema Registry)

OpenAI & MCP Schema Adapter: Normalizes external tool definitions (OpenAI Function JSON, MCP Server tool capabilities, and Custom Skill Specs) into a single, unified HarnessToolDefinition interface.

Skill vs. Tool Classifier: Differentiates atomic execution primitives (Tools, e.g., terminal commands or file reads) from multi-step composite workflows (Skills, e.g., repo refactoring or automated code auditing).

2. Outbound Compiler Layer (Model-Specific Prompting)

Chat Template & Context Formatter: Maps conversation history into exact model template syntaxes (Llama-3 Jinja formatting for AxxBot routing vs. Qwen ChatML XML/JSON formatting for Tier 2 execution).

Grammar & Schema Injection: Compiles registered tools and expected outputs into json_schema constraints for llama-server, enforcing structured outputs at the inference engine level.

3. Response Interceptor & Action Parser

Completion Parser: Intercepts raw completions—whether returned as strict JSON, markdown code blocks, or embedded prose—and normalizes them into a unified AgentAction result.

Payload Router: Directs parsed outputs into four distinct execution channels:

Tool/Skill Execution: Dispatches parameters to tools/executor.ts.

Workboard Mutation: Converts card creation and status update intents into validated SQLite payloads for memory.db.

Sub-Agent Delegation: Passes child task contexts down to Tier 2/3 workers.

User Message: Delivers final aggregated reports back to the CEO.

4. Open-Source Extensibility Strategy

Standard Schema Compliance: Uses JSON Schema Draft 7 as the baseline, making the harness compatible with any open-source AI tool library.

Execution Boundary Isolation: Keeps external tool dependencies inside the axx_env Python sandbox or isolated TypeScript wrappers, ensuring third-party tools cannot pollute the core orchestrator.
---
### END Axxanoid Harness: Build concepts and discoveries

### Axxanoid Harness: Build & Refactor Tracker
*Live section tracking of steps taken* 

* Step 1: Scaffold the Directory Tree -- done
* Step 2: Initialize the TypeScript Foundation -- done
cd ~/AXXANOID_HARNES
npm init -y
npm install typescript @types/node tsx --save-dev
npm install dotenv

generate tsconfig.json
package.json - replace the "scripts" block
* Step 3: Establish the Python Execution Sandbox
python3 -m venv axx_env

create /app/main.ts (port of main.py)
create /app/deamon-controler.ts (port of app_heartbeat.py)

* Step 4: The Engine Lock-In (models.ini & start-engine.sh)
download the exact locked-in models directly

hf download bartowski/Llama-3-Groq-8B-Tool-Use-GGUF Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf --local-dir .AXXANOID_HARNES/engine/models

hf download Qwen/Qwen2.5-Coder-14B-Instruct-GGUF qwen2.5-coder-14b-instruct-q4_k_m.gguf --local-dir .AXXANOID_HARNES/engine/models

Create AXXANOID_HARNES/engine/models.ini
Create AXXANOID_HARNES/engine/start-engine.sh

* Verification
Jeremys-MacBook-Pro: ~/axxanoid_harnes % npm run dev
> axxanoid_harnes@1.0.0 dev
> tsx watch app/main.ts

>>> Booting Axxanoid Harness ....
>>> API Listening on http://127.0.0.1:8000
>>> [SYSTEM] Initializing background heartbeat...***
* END Verification

* Step 5: The Orchestrator Loop
Shared SQLite is the most robust choice. It allows your TypeScript orchestrator and Python execution scripts inside axx_env to read and write state directly to a single file (memory.db) without context pollution or network overhead.

To handle concurrent access cleanly without database locks (SQLITE_BUSY), SQLite Write-Ahead Logging (WAL) mode (PRAGMA journal_mode = WAL;) and a busy timeout (PRAGMA busy_timeout = 5000;) are required.
* Step 5a: Install better-sqlite3
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
* Step 5b: Create the Database Module (app/database.ts)
* Step 5c: Connect Orchestrator Loop to Server Lifespan (app/main.ts)
* Verification
Jeremys-MacBook-Pro: ~/axxanoid_harnes % npm run dev

> axxanoid_harnes@1.0.0 dev
> tsx watch app/main.ts

>>> [DATABASE] Shared SQLite Workboard schema initialized in WAL mode.
>>> Booting Axxanoid Harness ....
>>> API Listening on http://127.0.0.1:8000
>>> [SYSTEM] Initializing startup heartbeat...
>>> [HEARTBEAT] Wake sequence initiated. Ingesting core directives into RAM...
>>> [HEARTBEAT WARNING] Missing directive file: SOUL.md. Skipping.
>>> [HEARTBEAT WARNING] Missing directive file: IDENTITY.md. Skipping.
>>> [HEARTBEAT WARNING] Missing directive file: HUMAN.md. Skipping.
>>> [HEARTBEAT WARNING] Missing directive file: HEARTBEAT.md. Skipping.
>>> [HEARTBEAT] Executing dynamic audits from HEARTBEAT.md...
>>> [HEARTBEAT] Audit complete. Ready for Engine Inference.
>>> [SYSTEM] Initializing background heartbeat (15m pulse)...
>>> [SYSTEM] Initializing Workboard Orchestrator (5s pulse)...
^C
>>> [SYSTEM] Shutting down daemon, Terminating heartbeat...
11:32:58 AM [tsx] Previous process hasn't exited yet. Force killing...
Jeremys-MacBook-Pro: ~/axxanoid_harnes % 
* END Verification

* Step 6a:** Create HTTP client targeting `llama-server` on port `8080` (`engine/llama-client.ts`).
* Step 6b:** Build schema translator & response interceptor (`engine/translator.ts`).
    updated orchestrator with process task

--- living ---

### End Axxanoid Harness: Build & Refactor Tracker - detailed

### Axxanoid Harness: Build & Refactor Tracker - Overview
## Current State
- Architecture officially transitioned from OpenClaw to a custom TypeScript/Python hybrid harness.
- Models locked: `Llama-3-Groq-8B-Tool-Use` (Routing) & `Qwen2.5-Coder-14B` (Execution).
- Engine locked: `llama.cpp` (`llama-server`) running concurrently with compressed KV cache.
- Database locked: Shared SQLite database running in Write-Ahead Logging (WAL) mode (`memory.db`).
- Task Orchestrator active: 5-second pulse loop sweeping Workboard cards and resolving dependency chains automatically (Domino Effect).

## To-Do List (Next Actions)
- [X] **Step 1:** Scaffold the `AXXANOID_HARNES` physical directory structure.
- [X] **Step 2:** Initialize the TypeScript foundation (`package.json`, `tsconfig.json`).
- [X] **Step 3:** Establish the Python execution sandbox (`axx_env`).
- [X] **Step 4:** Write `models.ini` and `start-engine.sh` with portable relative paths.
- [X] **Step 5: Workboard State & Orchestrator Implementation**
  - [X] **Step 5a:** Initialize SQLite schema in WAL mode (`app/database.ts`).
  - [X] **Step 5b:** Write task dispatch orchestrator (`app/orchestrator.ts`).
  - [X] **Step 5c:** Connect orchestrator loop to server lifespan (`app/main.ts`).
- [ ] **Step 6: Engine Client & Schema Translation Layer (`engine/`)**
  - [X] **Step 6a:** Create HTTP client targeting `llama-server` on port `8080` (`engine/llama-client.ts`).
  - [X] **Step 6b:** Build schema translator & response interceptor (`engine/translator.ts`).
  - [ ] **Step 6c:** Wire ready task execution dispatch in `app/orchestrator.ts` to `engine/llama-client.ts`.
- [ ] **Step 7: Workforce Definitions & Permission Scoping (`agents/`)**
  - [ ] **Step 7a:** Scaffold agent directories (`axxbot/`, `noid/`, `execubot/`, `dobot/`, `pubbot/`).
  - [ ] **Step 7b:** Write directive templates (`SOUL.md`, `IDENTITY.md`, `CAPABILITIES.md`, `WORKSPACE/`).
  - [ ] **Step 7c:** Enforce permission contracts (`contracts.json` per agent).
- [ ] **Step 8: Standardized Skills & Tools Framework (`skills/` & `tools/`)**
  - [ ] **Step 8a:** Build skill schema template (`skills/template.json`) and open-source tool adapter.
  - [ ] **Step 8b:** Implement secure execution wrapper targeting `axx_env` (`tools/executor.ts`).
- [ ] **Step 9: CLI Controls & Interactive CEO Terminal (`channels/cli.ts`)**
- [ ] **Step 10: Web UI Dashboard, REST API & Control Panel (`api/` & `channels/web/`)**
- [ ] **Step 11: End-to-End Validation & Playbook Verification**

## Completed Log
- [x] Defined Virtual Company Tiered Roster
- [x] Defined Hardware/Engine resource allocations
- [x] Established core documentation files (`README.md`, `END-TO-END.md`, `BUILD.md`)
- [x] Ported FastAPI daemon lifecycle to Express TS daemon (`app/main.ts`)
- [x] Ported Python audit runner to TypeScript-Python bridge (`app/daemon-control.ts`)
- [x] Created `engine/models.ini` and `engine/start-engine.sh`
- [x] Installed `better-sqlite3` and `@types/better-sqlite3`
- [x] Configured SQLite WAL mode schema for multi-process safety (`app/database.ts`)
- [x] Implemented Task Dispatch Orchestrator (`app/orchestrator.ts`) with automatic dependency chain resolution
- [x] Wired 5-second Orchestrator pulse loop and 15-minute Heartbeat pulse loop to Express server lifespan (`app/main.ts`)

### End Axxanoid Harness: Build & Refactor Tracker - Overview