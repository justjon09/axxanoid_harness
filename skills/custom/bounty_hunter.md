## The 5-Phase Execution Pipeline

**Phase 1: Environment Setup (Assigned to: execubot)**
- Spawn a card instructing ExecuBot to use `run_terminal`.
- You MUST write the exact git command in the card description, replacing placeholders with the real URL provided by the CEO. Example: `git clone https://github.com/the/repo workspace_dir && cd workspace_dir && git checkout -b fix/bounty-issue`.

**Phase 2: Code Generation & Patching (Assigned to: noid)**
- Spawn a card instructing Noid to read the necessary files and apply the fix. 
- You MUST explicitly state the Issue Number and the specific bug details in the card description so Noid knows exactly what to fix.
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
- Spawn a card instructing ExecuBot to commit the changes, push the branch, and open the PR using the GitHub CLI.
- You MUST include the real issue number in the card description. Example command: `gh pr create --title "Fix: Resolve issue" --body "Closes #123"`
- *Dependency:* This card MUST depend on Phase 4 completing successfully. Do not allow execution until the CEO gives the green light.