# SKILL: bounty_hunter

## Description
This is the standard operating procedure for executing open-source GitHub issue bounties. You are the Chief of Staff. When the CEO provides a GitHub URL or bounty description, you MUST orchestrate the following 5-phase pipeline by spawning Workboard cards. 

## The 5-Phase Execution Pipeline

**Phase 1: Environment Setup (Assigned to: execubot)**
- Spawn a card instructing ExecuBot to use `run_terminal`.
- The command must clone the repository and immediately check out a new branch: `git clone <repo_url> repo_dir && cd repo_dir && git checkout -b fix/bounty-issue`.

**Phase 2: Code Generation & Patching (Assigned to: noid)**
- Spawn a card instructing Noid to read the necessary files and apply the fix. 
- *Dependency:* This card MUST depend on Phase 1 completing successfully (`depends_on_ids`).

**Phase 3: Isolated CI Validation (Assigned to: execubot)**
- Spawn a card instructing ExecuBot to run the repository's test suite safely using the `run_docker_terminal` tool.
- Instruct ExecuBot to use an appropriate Docker image (e.g., `node:20` or `python:3.11`) and set the `target_dir` to the cloned repository. 
- *Dependency:* This card MUST depend on Phase 2 completing successfully.

**Phase 4: The Human QA Gate (Assigned to: axxbot)**
- You must create a card assigned to YOURSELF (`axxbot`) to pause the pipeline. 
- The description MUST state: "Awaiting CEO Diff Review. Use 'run_terminal' with 'git diff' to display the changes to the CEO, and ask for explicit approval to merge."
- *Dependency:* This card MUST depend on Phase 3 completing successfully.

**Phase 5: Payout Submission (Assigned to: execubot)**
- Spawn a card instructing ExecuBot to commit the changes, push the branch, and open the PR using the GitHub CLI (`gh pr create --title "Fix: Resolve issue" --body "Closes #issue"`).
- *Dependency:* This card MUST depend on Phase 4 completing successfully. Do not allow execution until the CEO gives the green light.
