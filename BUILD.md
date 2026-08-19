Our new harness will be Axxanoid Harness

AXXANOID_HARNES
AXXANOID_HARNES/readme.md
AXXANOID_HARNES/app/ (main entry, system level heartbeat)
AXXANOID_HARNES/axx_env/ (the python vene)
AXXANOID_HARNES/configs/(gateway, app, ect)
AXXANOID_HARNES/agents/(each agent definition soul/ identity/capabilities and workspace)
AXXANOID_HARNES/tools/
AXXANOID_HARNES/skills/
AXXANOID_HARNES/engine/ (parsing per-agent or model)(client/host setup)
AXXANOID_HARNES/api/
AXXANOID_HARNES/channels/ (web / cli / whatsapp / ect)

It enforces a strict **Separation of Concerns**. It isolates the model parsing from the agent personas, and it physically separates the core loop from the web UI.

### The `.AXXANOID_HARNES` Architecture Map

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

---
By stripping the Codeman source code down to its purest parts and rebuilding it into the Axxanoid Harness, you get an enterprise-grade async router that you control 100%.
---
The TS-to-Python Bridge (How it will work)
Before we write a line of code, we need to establish the contract between the Head (TypeScript) and the Hands (Python).

The TypeScript Orchestrator (app/ and engine/) maintains the continuous event loop, handles the Web UI/WebSockets, manages the Workboard state, and talks to llama.cpp on port 8080.

The Execution: When the TS engine determines that Noid needs to run a Python script or ExecuBot needs to hit the terminal, it doesn't try to execute it in Node.js. It uses Node's native child_process.spawn.

The Handoff: The TS core explicitly calls your isolated Python environment:
spawn('AXXANOID_HARNES/axx_env/bin/python', ['tools/master_cron.py', ...args]).

The Return: The TS core listens to the stdout (standard output) of that Python script, captures the result, and posts it back to the Kanban board.
---
* **Phase 1: Laying the Foundation**
* Because this is a massive refactor, we are going to build it from the ground up, starting with the bare-bones infrastructure. No bloat.*
* *The Skeleton Directories: Physically creating the .AXXANOID_HARNES folder structure you mapped out.*
* *The Python Sandbox: Creating the axx_env/ virtual environment inside the harness directory so we have our isolated execution room ready.*
* *The Project Init: Setting up the base package.json and tsconfig.json to support modern TypeScript and Node features.*


# Build & Refactor Tracker
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

* *Verification*
Jeremys-MacBook-Pro: ~/axxanoid_harnes % npm run dev
> axxanoid_harnes@1.0.0 dev
> tsx watch app/main.ts

>>> Booting Axxanoid Harness ....
>>> API Listening on http://127.0.0.1:8000
>>> [SYSTEM] Initializing background heartbeat...***
* *END Verification*

* Step 5: The Orchestrator Loop
Shared SQLite is the most robust choice. It allows your TypeScript orchestrator and Python execution scripts inside axx_env to read and write state directly to a single file (memory.db) without context pollution or network overhead.

To handle concurrent access cleanly without database locks (SQLITE_BUSY), SQLite Write-Ahead Logging (WAL) mode (PRAGMA journal_mode = WAL;) and a busy timeout (PRAGMA busy_timeout = 5000;) are required.
* Step 5a: Install better-sqlite3
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
* Step 5b: Create the Database Module (app/database.ts)
* Step 5c: Connect Schema to Server Boot (app/main.ts)
--- living ---

## Current State
- Architecture officially transitioned from OpenClaw to a custom TypeScript/Python hybrid harness.
- Models locked: `Llama-3-Groq-8B-Tool-Use` (Routing) & `Qwen2.5-Coder-14B` (Execution).
- Engine locked: `llama.cpp` (`llama-server`) running concurrently with compressed KV cache.

## To-Do List (Next Actions)
- [X] **Step 1:** Scaffold the `AXXANOID_HARNES` physical directory structure.
- [X] **Step 2:** Initialize the TypeScript foundation (`package.json`, `tsconfig.json`).
- [X] **Step 3:** Establish the Python execution sandbox (`axx_env`).
- [ ] **Step 4:** Write the `models.ini` and `start-engine.sh` files to stabilize the engine layer.
- [ ] **Step 5:** Port the base `Codeman` async orchestrator loop into the `app/` directory.
- [ ] **Step 6:** Build the `engine/` translation layer to parse `llama.cpp` JSON schemas natively.

## Completed Log
- [x] Defined Virtual Company Tiered Roster
- [x] Defined Hardware/Engine resource allocations
- [x] Established core documentation files