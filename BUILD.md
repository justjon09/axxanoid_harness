## Axxanoid Harness: Master Build Outline

### Phase 1: Engine, DB & Core Lifespan
* [x] **Step 1:** Scaffold physical directory structure (`.AXXANOID_HARNES/{app,axx_env,configs,agents,tools,skills,engine,api,channels}`).
* [x] **Step 2:** Initialize TypeScript foundation (`package.json`, `tsconfig.json`, `express`, `better-sqlite3`).
* [x] **Step 3:** Establish isolated Python execution sandbox (`axx_env`).
* [x] **Step 4:** Dual-model engine lock-in (`engine/models.ini` & `engine/start-engine.sh` using relative GGUF model paths).
* [x] **Step 5a:** Shared SQLite Workboard schema initialized in WAL mode (`app/database.ts` with `workboard_cards` and `card_dependencies`).

---

### Phase 2: State Machine & Translation Layer
* [X] **Step 5b:** Write Task Dispatch Orchestrator (`app/orchestrator.ts`)
    * Periodic polling loop for `ready` cards.
    * Dependency resolution (automatically converting `blocked` cards to `ready` when parent cards hit `done`).
    * Asynchronous worker dispatch to prevent context bleed.
* [X] **Step 5c:** Wire Orchestrator to Express Lifecycle (`app/main.ts`).
* [X] **Step 6:** Engine Client & Schema Translation Layer (`engine/llama-client.ts` & `engine/translator.ts`)
    * HTTP client targeting `llama-server` on port `8080`.
    * Router mapping: Directing AxxBot requests to `Llama-3-Groq-8B` and worker requests to `Qwen2.5-Coder-14B`.
    * Response interceptor: Normalizing output so markdown or plain text tool definitions are cleanly converted into standard `tool_calls` payloads.
* [X] **Step 7:** Strict Execution & Self-Healing Verification Gate (`app/orchestrator.ts`)
    * Prose Rejection: Reject conversational `user_message` responses as completions for worker tasks (e.g., Noid, ExecuBot).
    * OS Tool Execution: Intercept `tool_call` actions and dispatch directly to physical OS primitives in `tools/executor.ts`.
    * Exit Code 0 Verification: Mark cards `done` ONLY when physical file artifacts exist or terminal commands return exit code `0`.
    * Self-Healing Loop: Automatically catch `stderr` or non-zero exit codes, feed execution errors back into model context, and allow up to 3 self-correction retries before marking a task `failed`.

---

### Phase 3: Variable-Based Architecture & Registry Refactor
Architectural Rationale: Transition from hardcoded logic, duplicate schema declarations, and monolithic switch statements to a 100% variable-driven, self-discovering system. This refactor decouples machine permissions, runtime metadata, and LLM reasoning while allowing single-file tool/skill additions and developer-controlled toggles.
* [X] **Step 8:** Standardized 3-File Agent Model (AXXANOID_HARNES/agents/{agent}/)
    * config.json: Developer permission boundaries and machine routing (allowed_tools: ["workboard_*", "write_file"], assigned_model, tier, workspace_path). Parsed natively by Node for zero-overhead validation.
    * IDENTITY.md: Human/UI presentation metadata (Display Bio, Avatar path, Emoji).
    * SOUL.md: Cognitive prompt (persona, voice, boundaries, and the Path-to-Success invariant).
* [ ] **Step 9:** Multi-Tiered Self-Contained Tool Engine (AXXANOID_HARNES/tools/)
    * [ ] **Step 9a:** Single-File Modules: Delete tools/native.ts and the switch statement in tools/executor.ts. Each tool file exports both its LLM JSON Schema and its Node.js execute() function.
    * [ ] **Step 9b:** Hierarchical Directory Tree & Precedence:
        * tools/custom/: User-authored TypeScript execution tools. (Highest Priority)
        * tools/agent-built/: Tools generated dynamically at runtime by workers.
        * tools/imported/: Converted open-source / MCP tool definitions.
        * tools/native/: Core OS primitives (run_terminal, write_file, read_file). (Lowest Priority)
    * [ ] **Step 9c:**  Open-Source tools Adapter: Standardized JSON interface allowing external open-source tools to plug directly into the harness without re-engineering.
    * [ ] **Step 9d:**  Dynamic Auto-Loader (tools/index.ts): Scans all subdirectories at startup to populate ToolRegistry (Map<string, Tool>). Resolves name collisions using strict directory precedence.
* [ ] **Step 10:** Multi-Tiered Skill Engine (AXXANOID_HARNES/skills/)
    * Skill Template Standard: High-level workflow protocols instructing agents on how to combine core OS primitives for domain tasks (e.g., plugin refactoring, code auditing).
    * Multi-step sequence workflows organized into matching tiers (skills/native/, skills/custom/, skills/imported/).
    * Auto-discovered at boot time into a central SkillRegistry.

---

### Phase 4: System Control, Diagnostic Auditing & JIT Routing
* [ ] **Step 11:** system_control.json: Master developer override file allowing toggles ("enabled": false) on any tool or skill by ID to disable buggy dependencies system-wide.
* [ ] **Step 12:** Diagnostic Boot Audit: At boot, Node statically inspects all files in Tool/Skill registries. If a schema is invalid or exports are missing, Node outputs a detailed `[BOOT VERIFICATION FAILED]` terminal block (file path, error type, line number) and holds the orchestrator loop in a `PAUSED` state for live developer repair. Prevents LLMs from attempting unverified tool calls.
* [ ] **Step 13:** Method A Two-Pass JIT Tool Routing (`app/orchestrator.ts`):
    * Pass 1: Inject a lightweight 1-line text menu (Name + Summary) into the system prompt based on `config.json` wildcard permissions.
    * Pass 2: Intercept LLM's requested tools, hydrate only those specific full JSON parameter schemas into the prompt, and execute to prevent context-window bloat.
* [ ] **Step 14:** Standardized Logging: Stream `stdout`/`stderr` and process exit codes back to `workboard_cards.result_payload`.
* [ ] **Step 15:** Autonomous Task Decomposition & Needs-Based Blocking
    * Sub-Task Generation:*Tier 2 workers (e.g., Noid) pull top-level cards and emit `workboard_mutation` actions to spawn linked micro-step child cards (e.g., read codebase -> create backup -> write patch -> test/debug).
    * Needs Verification: Worker agents inspect dependencies and permissions (read/write access, environment setup, missing binaries) before executing a card.
    * Needs-Based Blocking: If a required permission, tool, or environment binary is missing/failing, the worker mutates the card status to `blocked` with a structured payload: `{ "missing_need": "...", "suggestion": "..." }`.
    * AxxBot Triage Loop: AxxBot polls `blocked` cards, evaluates the `missing_need`, suggests fixes to the CEO or spawns remediation tasks (e.g., ExecuBot installs dependency), and promotes the card back to `ready` once resolved.

---

### Phase 5: Workforce Definitions & Permission Scoping, Standardized Agent Roster Instantiation
* [ ] **Step 16:** Convert the full 5-agent workforce to the Phase 3 three-file specification:
    * *AxxBot (Tier 1 Chief of Staff):* Intent parsing, workboard card creation, triage on blocked tasks, user status reporting. Denied direct shell execution (`terminal:exec`). (Workboard orchestration, card decomposition, blocked task triage.)
    * *Noid (Tier 2 Coder):* Code analysis, task decomposition, file editing, and test verification. Restricted to project workspace. (File editing, code refactoring, test script creation.)
    * *ExecuBot (Tier 2 OS Delegate):* Shell/sandbox execution inside `axx_env`. (Virtualenv command execution, test runner, terminal primitives.)
    * *DoBot (Tier 2 SysAdmin):* System telemetry, database maintenance, and skill management. (Database maintenance, harness health telemetry.)
    * *PubBot (Tier 2 Publisher):* Documentation and Publication (web content) generation. (System documentation, release notes, Web UI content.)

---

### Phase 6: CLI Controls & Interactive Terminal
* [ ] **Step 17:** CLI Channel Interface (`channels/cli.ts`)
    * Interactive terminal client for the CEO.
    * Direct prompt entry to spawn top-level Workboard cards through AxxBot.
    * CLI control commands:
        * `axx add "Task"` — Directly inject a ready task into `memory.db`.
        * `axx status` — View active, blocked, and completed Workboard cards with missing needs.
        * `axx pause` / `axx resume` — Emergency halt on the orchestrator event loop.
        * `axx logs [agent]` — Stream real-time agent output and tool execution logs.
* [ ] **Step 18:** axx agent create: CLI command to generate new 3-file agent directories on demand without modifying TypeScript source code.
* [ ] **Step 19:** axx tool toggle: CLI command to update system_control.json and enable/disable system tools at runtime.
* [ ] **Step 20:** axx tool incorp: Tooling to wrap external MCP or open-source definitions into single-file harness modules.

---

### Phase 7: Web UI, Dashboard & Cron Controls
* [ ] **Step 21:** REST & WebSocket API Routes (`api/`)
    * Kanban board CRUD endpoints (`GET/POST /api/cards`, `PUT /api/cards/:id/status`).
    * Real-time WebSocket event broadcaster (`channels/web/ws-server.ts`) to push card updates, needs-triage alerts, and agent thought logs to the browser.
* [ ] **Step 22:** Web Dashboard Frontend (`channels/web/public/`)
    * Visual Kanban board interface showing real-time card transitions (`ready` -> `in_progress` -> `done`).
    * Cron & Heartbeat Control Panel: UI toggle for background heartbeat loops, frequency sliders, and audit script toggles.
    * Permissions & Directives Viewer: UI interface to view active contracts, edit `SOUL.md` / `HUMAN.md` directives, and manage file read permissions for AxxBot.

---

### Phase 8: Validation & End-to-End Factory Verification
* [ ] **Step 23:** Full System Assembly & Playbook Finalization
    * Multi-agent dependency chain test (AxxBot creates card -> Noid writes code -> ExecuBot executes -> AxxBot reports final output).
    * Lifecycle Integration Testing: Verify task flow from CLI input -> AxxBot decomposition -> Worker tool execution -> Card completion.
    * Path-to-Success Validation: Test hardware/out-of-scope requests to ensure zero impossibility rejections and proper blocked-state rerequisite card generation.
    * Self-Healing Loop Verification: Ensure non-zero exit codes from execute() trigger automatic retry and self-correction loops.
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
* **Function:** This folder's sole job is to translate the generic JSON outputs from `llama.cpp` (Port 8080) into standard tool calls. If Qwen hallucinates a markdown block, this engine intercepts it, formats it perfectly, and hands it to the `app/` layer.

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
* **TESTING TO DEFINED**
test schema normalization and response parsing without running the LLM engine.
- test script scripts/harnes-test/translator.ts
   * *Result* *
     Jeremys-MacBook-Pro: ~/axxanoid_harnes % npx tsx scripts/harnes-test/translator.ts
        Normalized Tool: {
        name: 'execute_terminal',
        description: 'Run terminal command in sandbox',
        type: 'tool',
        parameters: {
            command: { type: 'string', description: 'Bash command', required: true }
        },
        handler_type: 'typescript'
        }
        Parsed Markdown Action: {
        type: 'tool_call',
        target: 'execute_terminal',
        payload: { command: 'ls -la' },
        raw_response: 'Here is my response:\n' +
            '```json\n' +
            '{\n' +
            '  "type": "tool_call",\n' +
            '  "target": "execute_terminal",\n' +
            '  "payload": { "command": "ls -la" }\n' +
            '}\n' +
            '```'
        }
        Parsed Plain Text Action: {
        type: 'user_message',
        payload: { content: 'Task completed successfully without tools.' },
        raw_response: 'Task completed successfully without tools.'
        }
    * *END Result* *
test the Orchestrator's ability to resolve parent-child dependencies
- test script scripts/harnes-test/seed-dependency.ts
* *Result* *
    Jeremys-MacBook-Pro: ~/axxanoid_harnes % npx tsx scripts/harnes-test/seed-dependency.ts 
    Seeded parent-1 (done) and child-1 (blocked). Start server (`npm run dev`) to watch child-1 promote to READY.
* *END Result* *
Then start the daemon (npm run dev). Within 5 seconds, the Orchestrator pulse will log:
>>> [ORCHESTRATOR] Unblocked card "Test API Endpoints" (child-1) -> Promoted to READY
* *Result* *
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
        >>> [ORCHESTRATOR] Unblocked card "Test API Endpoints" (child-1) -> Promoted to READY
        >>> [ORCHESTRATOR] Found 1 READY task(s) on Workboard.
            -> [CARD child-1] Assigned to: DOBOT | Title: "Test API Endpoints"
        >>> [ORCHESTRATOR] Processing Task [child-1] with Assignee [DOBOT]
        >>> [ENGINE CLIENT ERROR] Failed to communicate with llama-server: fetch failed
        >>> [ORCHESTRATOR] Task [child-1] Execution Failed: fetch failed
        ^C
        >>> [SYSTEM] Shutting down daemon, Terminating heartbeat...
* *END Result* *
test HTTP connectivity.
- Start Engine (Terminal 1):  bash ~/axxanoid_harnes/engine/start-engine.sh 
* *Result* *
    Jeremys-MacBook-Pro: ~ % bash ~/axxanoid_harnes/engine/start-engine.sh
        Starting dual-slot llama-server engine on port 8080...
        0.00.052.483 I cmn  common_param: common_params_print_info: verbosity = 3 (adjust with the `-lv N` CLI arg)
        0.00.053.565 I srv   load_models: Loaded 0 cached model presets
        0.00.054.010 I srv   load_models: Loaded 2 custom model presets from /Users/justjon09/axxanoid_harnes/engine/models.ini
        0.00.054.067 I srv    operator(): Available models (2) (*: custom preset)
        0.00.054.068 I srv    operator():   * llama-3-groq-8b-tool-use
        0.00.054.068 I srv    operator():   * qwen2.5-coder-14b-instruct
        0.00.054.147 W srv  llama_server: -----------------
        0.00.054.148 W srv  llama_server: CORS is set to allow all origins ('*') and no API key is set
        0.00.054.148 W srv  llama_server: this can be a security risk (cross-origin attacks)
        0.00.054.148 W srv  llama_server: more info: https://github.com/ggml-org/llama.cpp/pull/25655
        0.00.054.148 W srv  llama_server: -----------------
        0.00.054.159 W srv  llama_server: -----------------
        0.00.054.159 W srv  llama_server: the following feature(s) are enabled:
        0.00.054.159 W srv  llama_server:     router mode
        0.00.054.159 W srv  llama_server: do not expose the server to untrusted environments
        0.00.054.159 W srv  llama_server: -----------------
        0.00.054.159 I srv  llama_server: starting server in router mode. models will be automatically loaded on-demand
        0.00.055.536 I srv  llama_server: listening on http://127.0.0.1:8080
        0.00.055.539 W srv  llama_server: NOTICE: server default port will be changed to :9931 in a future release
        0.00.055.539 W srv  llama_server:         ref: https://github.com/ggml-org/llama.cpp/pull/26508
* *END Result* *
- Test Health in Terminal 2: curl http://127.0.0.1:8080/health
* *Result* *
    Jeremys-MacBook-Pro: ~/axxanoid_harnes % curl http://127.0.0.1:8080/health             
    {"status":"ok"}%  
* *END Result* *
test a full task lifecycle (ready -> in_progress -> LLM Inference -> done or failed):
- Seed a ready Task:
        npx tsx -e "import { db } from './app/database.ts'; db.prepare(\"INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES ('task-101', 'Write a hello world script', 'Create a simple python hello world script', 'noid', 'ready')\").run();"
    npm run dev
* *Result* *
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
        >>> [ORCHESTRATOR] Found 1 READY task(s) on Workboard.
            -> [CARD task-101] Assigned to: NOID | Title: "Write a hello world script"
        >>> [ORCHESTRATOR] Processing Task [task-101] with Assignee [NOID]
        >>> [ENGINE CLIENT ERROR] Failed to communicate with llama-server: llama-server returned HTTP 400: {"error":{"code":400,"message":"model 'qwen_coder' not found","type":"invalid_request_error"}}
        >>> [ORCHESTRATOR] Task [task-101] Execution Failed: llama-server returned HTTP 400: {"error":{"code":400,"message":"model 'qwen_coder' not found","type":"invalid_request_error"}}
        ^C
        >>> [SYSTEM] Shutting down daemon, Terminating heartbeat...
        12:14:41 PM [tsx] Previous process hasn't exited yet. Force killing...
* *END Result* *
Minor updates to orchestrator 

test a full task lifecycle (ready -> in_progress -> LLM Inference -> done or failed):
- Seed a ready Task:
        npx tsx -e "import { db } from './app/database.ts'; db.prepare(\"INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES ('task-102', 'Write a hello world script', 'Create a simple python hello world script', 'noid', 'ready')\").run();"
    npm run dev
* *Result* *
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
        >>> [ORCHESTRATOR] Found 1 READY task(s) on Workboard.
            -> [CARD task-102] Assigned to: NOID | Title: "Write a hello world script"
        >>> [ORCHESTRATOR] Processing Task [task-102] with Assignee [NOID]
        >>> [ORCHESTRATOR] Task [task-102] Execution Failed: formatPromptForModel is not defined
        ^C
        >>> [SYSTEM] Shutting down daemon, Terminating heartbeat...
        12:43:30 PM [tsx] Previous process hasn't exited yet. Force killing...
* *END Result* *
Minor updates to orchestrator Again

test a full task lifecycle (ready -> in_progress -> LLM Inference -> done or failed):
- Seed a ready Task:
        npx tsx -e "import { db } from './app/database.ts'; db.prepare(\"INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES ('task-103', 'Write a hello world script', 'Create a simple python hello world script', 'noid', 'ready')\").run();"
    npm run dev
* *Result* *
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
        >>> [ORCHESTRATOR] Found 1 READY task(s) on Workboard.
            -> [CARD task-103] Assigned to: NOID | Title: "Write a hello world script"
        >>> [ORCHESTRATOR] Processing Task [task-103] with Assignee [NOID]
        >>> [ENGINE CLIENT ERROR] Failed to communicate with llama-server: llama-server returned HTTP 500: {"error":{"code":500,"message":"model name=qwen2.5-coder-14b-instruct failed to load","type":"server_error"}}
        >>> [ORCHESTRATOR] Task [task-103] Execution Failed: llama-server returned HTTP 500: {"error":{"code":500,"message":"model name=qwen2.5-coder-14b-instruct failed to load","type":"server_error"}}
        ^C
        >>> [SYSTEM] Shutting down daemon, Terminating heartbeat...
        2:41:50 PM [tsx] Previous process hasn't exited yet. Force killing...
    ---
    llama result:
    [50534] 0.00.053.440 E llama_model_load_from_file_impl: failed to load model
    [50534] 0.00.053.441 E cmn  common_init_: failed to load model './models/qwen2.5-coder-14b-instruct-q4_k_m.gguf'
    [50534] 0.00.053.441 E srv    load_model: failed to load model, './models/qwen2.5-coder-14b-instruct-q4_k_m.gguf'
    [50534] 0.00.053.442 I srv    operator(): operator(): cleaning up before exit...
    [50534] 0.00.053.641 E srv  llama_server: exiting due to model loading error
    153.27.331.039 I srv    operator(): instance name=qwen2.5-coder-14b-instruct exited with status 1
    153.27.331.179 W srv    operator(): got exception: {"error":{"code":500,"message":"model name=qwen2.5-coder-14b-instruct failed to load","type":"server_error"}}

* *END Result* *
cd "$(dirname "$0")" -- added to start engin

test a full task lifecycle (ready -> in_progress -> LLM Inference -> done or failed):
- Seed a ready Task:
        npx tsx -e "import { db } from './app/database.ts'; db.prepare(\"INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES ('task-104', 'Write a hello world script', 'Create a simple python hello world script', 'noid', 'ready')\").run();"
    npm run dev
* *Result* *
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
        >>> [ORCHESTRATOR] Found 1 READY task(s) on Workboard.
            -> [CARD task-104] Assigned to: NOID | Title: "Write a hello world script"
        >>> [ORCHESTRATOR] Processing Task [task-104] with Assignee [NOID]
        >>> [ORCHESTRATOR] Task [task-104] Completed Successfully.
        ^C
        >>> [SYSTEM] Shutting down daemon, Terminating heartbeat...
        2:51:30 PM [tsx] Previous process hasn't exited yet. Force killing...
    ---
    llama result:
        2.33.871.949 I srv  ensure_model: model name=qwen2.5-coder-14b-instruct is not loaded, loading...
        2.33.872.019 I srv          load: spawning server instance with name=qwen2.5-coder-14b-instruct on port 50566
        2.33.872.032 I srv          load: spawning server instance with args:
        2.33.872.034 I srv          load:   /opt/homebrew/Cellar/llama.cpp/10280/bin/llama-server
        2.33.872.034 I srv          load:   --host
        2.33.872.035 I srv          load:   127.0.0.1
        2.33.872.035 I srv          load:   --jinja
        2.33.872.035 I srv          load:   --port
        2.33.872.035 I srv          load:   50566
        2.33.872.035 I srv          load:   --alias
        2.33.872.035 I srv          load:   qwen2.5-coder-14b-instruct
        2.33.872.036 I srv          load:   --cache-type-k
        2.33.872.036 I srv          load:   q8_0
        2.33.872.036 I srv          load:   --cache-type-v
        2.33.872.036 I srv          load:   q8_0
        2.33.872.037 I srv          load:   --flash-attn
        2.33.872.038 I srv          load:   1
        2.33.872.038 I srv          load:   --model
        2.33.872.038 I srv          load:   ./models/qwen2.5-coder-14b-instruct-q4_k_m.gguf
        2.33.872.038 I srv          load:   --parallel
        2.33.872.038 I srv          load:   2
        2.33.872.372 I srv  ensure_model: waiting until model name=qwen2.5-coder-14b-instruct is fully loaded...
        [50566] 0.00.047.233 I cmn  common_param: common_params_print_info: verbosity = 3 (adjust with the `-lv N` CLI arg)
        [50566] 0.00.047.407 W srv  llama_server: -----------------
        [50566] 0.00.047.409 W srv  llama_server: CORS is set to allow all origins ('*') and no API key is set
        [50566] 0.00.047.409 W srv  llama_server: this can be a security risk (cross-origin attacks)
        [50566] 0.00.047.409 W srv  llama_server: more info: https://github.com/ggml-org/llama.cpp/pull/25655
        [50566] 0.00.047.409 W srv  llama_server: -----------------
        [50566] cmd_child_to_router:state:{"state":"loading","payload":{"stages":["text_model"],"current":"text_model","value":0.0}}
        [50566] 0.00.048.845 I srv    load_model: loading model './models/qwen2.5-coder-14b-instruct-q4_k_m.gguf'
        [50566] 0.00.370.649 W load: control-looking token: 128247 '</s>' was not control-type; this is probably a bug in the model. its type will be overridden
        [50566] cmd_child_to_router:state:{"state":"loading","payload":{"stages":["text_model"],"current":"text_model","value":0.0}}
        [50566] cmd_child_to_router:state:{"state":"loading","payload":{"stages":["text_model"],"current":"text_model","value":1.0}}
        [50566] 0.06.658.714 W llama_context: n_ctx is not divisible by n_seq_max - rounding down to 89088
        [50566] 0.10.804.686 I srv    load_model: initializing, n_slots = 2, n_ctx_slot = 44544, kv_unified = 'false'
        [50566] 0.10.816.893 I srv  llama_server: model loaded
        [50566] 0.10.817.234 I srv  llama_server: listening on http://127.0.0.1:50566
        [50566] 0.10.817.440 I srv    operator(): child server monitoring thread started, waiting for EOF on stdin...
        [50566] cmd_child_to_router:state:{"state":"ready","payload":{"id":"qwen2.5-coder-14b-instruct","aliases":["qwen2.5-coder-14b-instruct"],"tags":[],"object":"model","created":1787608262,"owned_by":"llamacpp","meta":{"vocab_type":2,"n_vocab":152064,"n_ctx":44544,"n_ctx_train":131072,"n_embd":5120,"n_params":14770033664,"size":8982142976,"ftype":"Q4_K - Medium"}}}
        2.44.704.741 I srv  proxy_reques: proxying request to model qwen2.5-coder-14b-instruct on port 50566
        [50566] 0.10.910.693 I slot get_availabl: id  1 | task -1 | selected slot by LRU, t_last = -1
        [50566] 0.10.911.526 I slot launch_slot_: id  1 | task 0 | processing task, is_child = 0
        [50566] 0.15.084.646 I slot print_timing: id  1 | task 0 | n_decoded =    100, tg =  25.91 t/s, tg_3s =  25.91 t/s
        [50566] 0.16.178.884 I slot print_timing: id  1 | task 0 | prompt eval time =     313.79 ms /    46 tokens (    6.82 ms per token,   146.59 tokens per second)
        [50566] 0.16.178.895 I slot print_timing: id  1 | task 0 |        eval time =    4953.52 ms /   128 tokens (   38.70 ms per token,    25.84 tokens per second)
        [50566] 0.16.178.896 I slot print_timing: id  1 | task 0 |       total time =    5267.32 ms /   174 tokens
        [50566] 0.16.178.896 I slot print_timing: id  1 | task 0 |    graphs reused =        127
        [50566] 0.16.178.993 I slot      release: id  1 | task 0 | stop processing: n_tokens = 173, truncated = 0

    ---
    Task Result
        Jeremys-MacBook-Pro: ~/axxanoid_harnes % npx tsx -e "import { db } from './app/database.ts'; const card = db.prepare(\"SELECT result_payload FROM workboard_cards WHERE id = 'task-104'\").get(); console.log(JSON.parse(card.result_payload));"
        {
        type: 'user_message',
        payload: {
            content: 'Certainly! Below is a simple Python script that prints "Hello, World!" to the console:\n' +
            '\n' +
            '```python\n' +
            '# This is a simple Python script to print "Hello, World!"\n' +
            '\n' +
            'def main():\n' +
            '    print("Hello, World!")\n' +
            '\n' +
            'if __name__ == "__main__":\n' +
            '    main()\n' +
            '```\n' +
            '\n' +
            'To run this script, you can save it to a file with a `.py` extension, for example, `hello_world.py`, and then execute it using a Python interpreter by running the following command in your terminal or command prompt:\n' +
            '\n' +
            '```bash\n' +
            'python hello_world.py\n' +
            '```\n' +
            '\n' +
            'This will output:\n' +
            '\n' +
            '```\n' +
            'Hello, World!\n' +
            '```'
        },
        raw_response: 'Certainly! Below is a simple Python script that prints "Hello, World!" to the console:\n' +
            '\n' +
            '```python\n' +
            '# This is a simple Python script to print "Hello, World!"\n' +
            '\n' +
            'def main():\n' +
            '    print("Hello, World!")\n' +
            '\n' +
            'if __name__ == "__main__":\n' +
            '    main()\n' +
            '```\n' +
            '\n' +
            'To run this script, you can save it to a file with a `.py` extension, for example, `hello_world.py`, and then execute it using a Python interpreter by running the following command in your terminal or command prompt:\n' +
            '\n' +
            '```bash\n' +
            'python hello_world.py\n' +
            '```\n' +
            '\n' +
            'This will output:\n' +
            '\n' +
            '```\n' +
            'Hello, World!\n' +
            '```'
        }
* *END Result* *

* Step 7:* Strict Execution & Self-Healing Verification Gate
    *OS Tool Execution: Intercept `tool_call` actions and dispatch directly to physical OS primitives in `tools/executor.ts`.*
    *Verified Closed-Loop Orchestrator (app/orchestrator.ts)*
    *Verification Test*
npx tsx -e "import { db } from './app/database.ts'; db.prepare(\"INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES ('task-105', 'Write hello script', 'Use write_file to create ./hello_world.py with content print(\\\"Hello from Axxanoid\\\")', 'noid', 'ready')\").run();"
* *Result* *
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
    >>> [ORCHESTRATOR] Found 1 READY task(s) on Workboard.
        -> [CARD task-105] Assigned to: NOID | Title: "Write hello script"
    >>> [ORCHESTRATOR] Processing Task [task-105] with Assignee [NOID]
    >>> [ORCHESTRATOR] Task [task-105] Execution Attempt 1/3
    >>> [EXECUTION] Intercepted Tool [write_file]. Executing on OS...
    >>> [EXECUTION VERIFIED SUCCESS]: Successfully wrote 28 characters to ./hello_world.py
    >>> [ORCHESTRATOR] Task [task-105] Finalized -> STATUS: DONE

    llama result:
    1345.29.971.865 I srv  proxy_reques: proxying request to model qwen2.5-coder-14b-instruct on port 50566
    [50566] 1342.56.161.522 I slot get_availabl: id  0 | task -1 | selected slot by LRU, t_last = -1
    [50566] 1342.56.162.790 I slot launch_slot_: id  0 | task 129 | processing task, is_child = 0
    [50566] 1343.04.348.334 I slot print_timing: id  0 | task 129 | prompt eval time =    6007.37 ms /   497 tokens (   12.09 ms per token,    82.73 tokens per second)
    [50566] 1343.04.348.337 I slot print_timing: id  0 | task 129 |        eval time =    2172.60 ms /    54 tokens (   40.23 ms per token,    24.86 tokens per second)
    [50566] 1343.04.348.337 I slot print_timing: id  0 | task 129 |       total time =    8179.97 ms /   551 tokens
    [50566] 1343.04.348.337 I slot print_timing: id  0 | task 129 |    graphs reused =        178
    [50566] 1343.04.360.731 I slot      release: id  0 | task 129 | stop processing: n_tokens = 550, truncated = 0
    
    tools/hello_world.py created:
    print("Hello from Axxanoid")
* *END Result* *


STOP ALL and REFACTOR -----
* Step 8:* Standardized 3-File Agent Model (AXXANOID_HARNES/agents/{agent}/)
contracts renamed to config, permission cahnged to allowed_tools and allowed_skills
removed routing from 
* Step 9:* Multi-Tiered Self-Contained Tool Engine (AXXANOID_HARNES/tools/)
    * Four subdirectories to establish the tiered hierarchy:
        *tools/custom/* *tools/agent-built/* *tools/imported/* *tools/native/*
    * Create tools/native/write_file.ts
    * Create tools/native/read_file.ts
    * Create tools/native/list_files.ts
    * Create tools/native/run_terminal.ts
    * Create tools/native/workboard_read.ts
    * Create tools/native/workboard_create.ts
    * Create tools/native/workboard_mutate.ts

--- living ---

### End Axxanoid Harness: Build & Refactor Tracker - detailed

### Axxanoid Harness: Build & Refactor Tracker - Overview
## Current State
- Architecture officially transitioned from OpenClaw to a custom TypeScript/Python hybrid harness.
- Models locked: `Llama-3-Groq-8B-Tool-Use` (Routing) & `Qwen2.5-Coder-14B` (Execution).
- Engine locked: `llama.cpp` (`llama-server`) running concurrently with compressed KV cache.
- Database locked: Shared SQLite database running in Write-Ahead Logging (WAL) mode (`memory.db`).
- Task Orchestrator active: 5-second pulse loop sweeping Workboard cards and resolving dependency chains automatically (Domino Effect).
- Verified inference loop and action parsing via task-104 test.
- Built Strict Execution & Self-Healing Verification Gate (task-105 test)
- Defined agent scafolding
- Active focus: Step 9:* Multi-Tiered Self-Contained Tool Engine 

## To-Do List (Next Actions)
- [X] **Step 1:** Scaffold the `AXXANOID_HARNES` physical directory structure.
- [X] **Step 2:** Initialize the TypeScript foundation (`package.json`, `tsconfig.json`).
- [X] **Step 3:** Establish the Python execution sandbox (`axx_env`).
- [X] **Step 4:** Write `models.ini` and `start-engine.sh` with portable relative paths.
- [X] **Step 5: Workboard State & Orchestrator Implementation**
  - [X] **Step 5a:** Initialize SQLite schema in WAL mode (`app/database.ts`).
  - [X] **Step 5b:** Write task dispatch orchestrator (`app/orchestrator.ts`).
  - [X] **Step 5c:** Connect orchestrator loop to server lifespan (`app/main.ts`).
- [X] **Step 6:** Engine Client & Schema Translation Layer (`engine/llama-client.ts` & `engine/translator.ts`)
- [X] **Step 7:** Strict Execution & Self-Healing Verification Gate (app/orchestrator.ts & tools/executor.ts)
- [X] **Step 8:** Standardized 3-File Agent Model (config.json, IDENTITY.md, SOUL.md)
- [ ] **Step 9:** Multi-Tiered Self-Contained Tool Engine (Directory precedence & auto-discovery)
- [ ] **Step 10:** Multi-Tiered Skill Engine (Workflow templates & auto-discovery)
- [ ] **Step 11:** System Control & Diagnostic Boot Audit (system_control.json & static file inspection)
* [ ] **Step 12:** Diagnostic Boot Audit: At boot, Node statically inspects all files in Tool/Skill registries.
- [ ] **Step 13:** Method A Two-Pass JIT Tool Routing (app/orchestrator.ts refactor)
- [ ] **Step 14:** Standardized Logging (stdout/stderr to memory.db)
- [ ] **Step 15:** Autonomous Task Decomposition & Needs-Based Blocking
- [ ] **Step 16:** Full Agent Roster Standardization (AxxBot, Noid, ExecuBot, DoBot, PubBot)
- [ ] **Step 17:** CLI Channel Interface (channels/cli.ts)
- [ ] **Step 18:** CLI Generators (axx agent create, axx tool toggle)
- [ ] **Step 19:** CLI Generators (axx tool toggle)
- [ ] **Step 20:** MCP / Open-Source Tool Import Automation
- [ ] **Step 21:** REST & WebSocket API Routes (api/)
- [ ] **Step 22:** Web Dashboard Frontend (channels/web/public/)
- [ ] **Step 23:** Full System Assembly & Playbook Finalization


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
- [x] Implemented engine/llama-client.ts and engine/translator.ts
- [x] Verified full lifecycle routing from Orchestrator to llama-server on port 8080 (task-104 test)
- [x] Implemented tools/executor.ts and closed-loop OS execution in app/orchestrator.ts (task-105 test)
- [x] single agent scafolding setup AxxBot

### End Axxanoid Harness: Build & Refactor Tracker - Overview