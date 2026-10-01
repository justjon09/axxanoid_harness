# Axxanoid OS — Freelance Code Engine

## Conceptual Overview
The Freelance Code engine is a specialized extension of Axxanoid OS designed for semi-autonomous open-source issue resolution and bounty extraction. It leverages the multi-agent workforce to clone repositories, apply code patches, execute test suites inside ephemeral Docker containers, and submit pull requests—requiring human intervention only during a brief, final diff review.

## Workforce Responsibilities
- **AxxBot (Tier 1 Router):** Ingests GitHub issue URLs, executes `bounty_hunter` playbook, creates 5-phase card chains, and halts execution for CEO review at Phase 4.
- **Noid (Tier 2 Coder):** Reads codebase files, analyzes bug reports, writes code fixes, and updates source files.
- **ExecuBot (Tier 2 Delegate):** Executes Git operations, runs containerized test suites via `run_docker_terminal`, and issues PRs using the GitHub CLI (`gh`).

## Core Capabilities & Tools
- **Isolated Sandbox Execution:** `run_docker_terminal` bind-mounts workspace repos into temporary Docker containers (`node:20`, `python:3.11`), guaranteeing zero host pollution from untrusted third-party code.
- **Self-Healing Test Iteration:** Non-zero exit codes from Docker container runs feed stack traces back into Noid's context until all tests pass.
- **Human QA Safety Gate:** No code is pushed to external repositories without explicit CEO approval.

## System Dependencies
- **TOOLS:** 
- **SKILLS:** 
- **Execution Sandbox:**