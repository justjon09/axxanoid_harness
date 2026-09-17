# Freelance Code: End-to-End Installation & Operational Guide

*This document serves as the absolute sequence to take a running Axxanoid Harness to a fully operational Freelance Code Loop.*

## Phase 1: Environment Preparation
1. **Ensure Docker Daemon is Active:**
   docker --version
   docker ps
2. **Authenticate GitHub CLI on Host Mac:**
   gh auth login
   gh auth status
3. **Verify Axxanoid System Audit:**
   npm run axx -- audit
   - Confirm run_docker_terminal, bounty_hunter, and docker_ci_runner are registered.

## Phase 2: Live Execution Workflow
1. **Boot System**
   - Terminal 1: Start llama-server engine:
      ./engine/start-engine.sh
   - Terminal 2: Start Node Daemon:
      npm run dev
2. **Ingest Bounty Task**
   Open Web Dashboard at http://127.0.0.1:8000 or use CLI. Issue prompt to AxxBot:
      "AxxBot, initiate bounty hunter protocol for issue #123 at https://github.com/owner/repo."
3. **Automated Execution Sweep**
   - Phase 1 (ExecuBot): Clones repo, checks out fix/bounty-issue branch.
   - Phase 2 (Noid): Inspects source files, generates code fix.
   - Phase 3 (ExecuBot): Mounts repo into Docker container, executes npm test or pytest. Iterates until green.
   - Phase 4 (AxxBot): Pauses pipeline, notifies CEO.
4. **Human QA Review & Submission**
   - Review git diff:
      git diff main..HEAD
   - Approve PR creation in Web Dashboard chat:
      "Approved. Proceed with Phase 5."