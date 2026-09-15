# FREELANCE CODE - Master Build & Operational Blueprint

## 1. Project Overview & Architecture
The Freelance Code subsystem converts Axxanoid OS into an autonomous, human-in-the-loop developer bounty factory.

[Target GitHub Issue / URL]
│
▼
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Environment Setup (ExecuBot - run_terminal)    │
│ Clones repo & creates working git branch                │
└──────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│ Phase 2: Patch Generation (Noid - write_file/read_file) │
│ Analyzes codebase & writes fix                          │
└──────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Isolated CI Test (ExecuBot - Docker Runner)    │
│ Runs tests inside container (node:20, python:3.11, etc) │
└──────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│ Phase 4: Human QA Gate (AxxBot - Pauses Pipeline)       │
│ CEO inspects git diff (CLI/UI) & grants approval        │
└──────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│ Phase 5: PR Submission & Payout (ExecuBot - gh CLI)     │
│ Commits, pushes branch, opens PR -> Payout triggered    │
└─────────────────────────────────────────────────────────┘

---

## 2. Target Selection Walkthrough
### Base Rules
* **Deterministic Verification:** Only accept issues with existing, passing CI/CD suites. The agent requires an objective mathematical pass/fail signal.
* **Scope Discipline:** Focus exclusively on labels: `bug`, `refactor`, `type-fix`, or `test-coverage`.
* **Zero UI/UX Inventions:** Reject requests for "New UI designs," "Add dashboard," or ambiguous feature prompts.

### Profit Rules
* **Bounty Range:** Target tasks valued between **$50 and $500**.
* **Freshness Filter:** Only take issues created or funded within the last 14 days. Avoid stale, abandoned repositories.
* **Maintainer Responsiveness:** Verify the repo has merged PRs within the last 30 days.

### Complexity Guidelines
* **File Limit:** Prefer issues touching $\le 5$ source files.
* **Language Match:** 
  * TypeScript / JavaScript (`node:20`)
  * Python (`python:3.11`)
  * Go (`golang:latest`)
  * Rust (`rust:latest`)

### The Pre-Flight Double Check
Before issuing a bounty prompt to AxxBot:
1. Verify Docker Desktop / daemon is active on the host Mac (`docker ps`).
2. Run `npm run axx -- audit` to verify all tool/skill dependencies are green.
3. Ensure GitHub CLI (`gh`) is authenticated on the host (`gh auth status`).

---

## 3. Getting Paid: Step-by-Step Payout Pipeline
1. **Platform Onboarding:** Link your GitHub profile to **Algora**, **Opire**, or **Boss.dev** and complete Stripe Connect identity verification.
2. **Execution & PR:** Axxanoid OS solves the issue and submits the PR via `gh pr create --body "Closes #issue"`.
3. **Merge Event:** Maintainer reviews and merges the PR. The platform bot automatically detects the merge and releases escrow.
4. **Stripe Settlement:** 
   * **First Payout:** Stripe enforces a 7-day security holding period for new Connect accounts.
   * **Ongoing:** Funds auto-transfer to your checking account on a 1–2 business day rolling schedule.

---

## 4. Human QA & UI Review Gate

When Phase 4 is reached, AxxBot halts the card chain. Inspect the patch before authorizing Phase 5:

* **Option A (CLI):**
  ```bash
  cd agents/execubot/WORKSPACE/<repo_dir>
  git diff main..HEAD

* **Option B (Web Dashboard):**
- Open http://127.0.0.1:8000, click the Phase 4 card on the Kanban board, and inspect the result_payload.

If approved, issue the command in chat:
- "AxxBot, approve Phase 5 for card [card-id]. Submit the PR."

---


1. Mapping the Bounty Pipeline
Instead of a single bot trying to juggle context, your specialized agents handle the lifecycle asynchronously:
- Ingestion: You paste the GitHub issue URL into the Command Center; AxxBot reads it and spawns the sub-tasks.
- Setup & Code: ExecuBot clones the repo and configures the environment, while Noid analyzes the files and writes the patch.
- Validation: ExecuBot runs the test suite; Axxanoid's native self-healing loop automatically catches non-zero exit codes and forces Noid to iterate until the suite passes.
- The Gate: You review the final diff in the UI, and ExecuBot pushes the PR via the GitHub CLI to trigger the payout.

2. The Execution Sandbox
Running untrusted open-source code (like random npm install scripts) directly on your Mac is a massive security risk. We will adapt your Docker concept directly into ExecuBot's lane.
- The Tool: We will build a run_docker_terminal tool for ExecuBot.
- The Isolation: Instead of executing in axx_env, ExecuBot mounts the specific bounty workspace into an ephemeral Docker container to run the tests safely.
- The Cleanup: Once the exit code returns 0, the container is destroyed automatically, leaving your host machine perfectly clean.

3. The New Skill Playbooks
To make this autonomous, we just need to teach your agents the rules of the bounty game. We will create two new files:
- skills/custom/bounty_hunter.md: Instructs AxxBot on how to parse GitHub issues and assign the proper repository tasks.
- skills/custom/docker_ci_runner.md: Instructs ExecuBot to run all unknown test suites inside the Docker container rather than the local shell.

4. Market Selection Strategy
To maximize your ROI and minimize hallucinations, stick to binary, verifiable outcomes:
- Target repositories with existing, green CI/CD pipelines so Noid has a strict mathematical baseline to test against.
- Filter for bug, refactor, or flaky-test labels where the success criteria are absolute.
- Avoid vague "feature" requests that require subjective human design choices or lack test coverage.

Let's ground the financial reality first, build out your selection matrix, and then define exactly how your agents will handle the Git operations and Docker isolation.

1. Getting Paid: The Stripe Connect Standard
You cannot route open-source bounties through your Shopify site or a custom high-risk payment processor. Platforms like Algora, Opire, and Boss.dev hold the client's bounty in escrow. When a repository maintainer merges your PR, the platform API programmatically releases the funds via Stripe Connect directly to your bank account. You must set up a Stripe Connect account linked to your GitHub profile to participate; it is the non-negotiable industry standard for automated developer payouts.

2. Market Selection Strategy
To make this pipeline autonomous, you must completely avoid subjective tasks. Your AI agents need absolute mathematical certainty to know if they succeeded.
- Target Binary Outcomes: Only accept issues tagged with bug, refactor, type-fix, or test-coverage.
- Require Active CI/CD: The target repository must have passing GitHub Actions. Noid needs a pre-existing, strict test suite to validate his patches against.
- Filter for Recency: Sort by "Recently Funded." Do not waste compute on 6-month-old issues where the maintainer is unresponsive.
- Avoid Feature Creep: Reject requests for "New UI design" or "Add a dashboard." Subjective human approval breaks the automated testing loop.

3. Automating Git Operations
You do not need a custom tool to handle Git operations. Because ExecuBot has access to run_terminal, he can leverage the standard git and GitHub CLI (gh) binaries already installed on your Mac. We will simply encode the exact sequence (clone, branch, commit, push, PR) into AxxBot's bounty_hunter playbook. You will act as the final human QA gate before ExecuBot fires the gh pr create command.

4. The Bounty Pipeline Assets
To bring this online, we need to inject three new files into your framework:
- tools/custom/run_docker_terminal.ts: A tool that bind-mounts your workspace into an ephemeral Docker container (e.g., node:20 or python:3.11) to execute untrusted test suites safely.
- skills/custom/bounty_hunter.md: The master playbook instructing AxxBot how to parse a GitHub URL, delegate cloning, assign code generation, and pause for your final diff review.
- skills/custom/docker_ci_runner.md: The playbook instructing ExecuBot to strictly use the Docker tool for third-party execution.






## FREELANCE CODE - BUILD PROCESS (LIVE)
1. Build the Docker Terminal Tool
- tools/custom/run_docker_terminal.ts
2. Give ExecuBot the Keys
- "run_docker_terminal": true (configs/system_control.json)
- "run_docker_terminal" (agents/execubot/config.json)
*- Verification NOT DONE*
3. Build the Bounty Hunter Skill
- skills/custom/bounty_hunter.md
4. Give AxxBot the Keys
- "bounty_hunter": true (configs/system_control.json)
- "bounty_hunter" (agents/axxbot/config.json)
*-The Domino Effect in Action NOT TESTED*
5. Build the Docker CI Runner Skill
- skills/custom/docker_ci_runner.md
6. Give ExecuBot the Keys
- "docker_ci_runner": true (configs/system_control.json)
- "docker_ci_runner" (agents/execubot/config.json)
7. Documentation
- build-tracking/freelance-code/BUILD.md
- build-tracking/freelance-code/README.md
- build-tracking/freelance-code/END-TO-END.md


## FREELANCE CODE - Initial Run (LIVE)
1. **Host Environment Verification**
    - Verify Docker is awake: Running mac native docker desktop
        verifed: % docker ps
            CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
    - Verify GitHub CLI is authenticated
        verified: % gh auth status
            github.com
            ✓ Logged in to github.com account
2. **The Dry Run Execution**
    - Terminal 1:
        ./engine/start-engine.sh 
            ("listening on http://127.0.0.1:8080").
    - Terminal 2:
        npm run dev
            >>> Booting Axxanoid Harness ....
            >>> API Listening on http://127.0.0.1:8000
            >>> [WEBSOCKET] Server initialized and attached to Express.
3. **Command the Chief of Staff**
    - CEO Dashboard input:
        "AxxBot, initiate bounty hunter protocol for issue #1 at https://github.com/expressjs/express. The issue states we need to update the readme file."

## FULL BREAK single tool then stopped - no response in chat -- fail
1. Fix the Execution Gate (app/orchestrator.ts)
    ONLY kill the execution loop if the agent explicitly mutated its own card to an end state
        why do we even need taskComplete var ? 
