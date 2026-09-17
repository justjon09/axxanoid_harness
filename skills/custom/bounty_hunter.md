# SKILL: bounty_hunter

## Description
This is the standard operating procedure for executing open-source GitHub bounties. As Chief of Staff, your job is to translate the CEO's request into a strict 5-phase execution pipeline. 

**CRITICAL CONTEXT RULE:** The execution workers (Noid, ExecuBot) cannot see the CEO's chat messages. When the CEO provides the GitHub URL and the specific bug details, you MUST inject those exact details directly into the Phase 2 card. Do not summarize or omit the CEO's instructions, or the workers will fail.

## The 5-Phase Execution Pipeline

You MUST create 5 cards linked sequentially using `depends_on_ids`. Write the descriptions as direct commands to the workers. Do NOT write "spawn a card" in the descriptions.

**Phase 1: Environment Setup (Assign to: execubot)**
- Description MUST contain the exact git command targeting the shared workspace.
- Description MUST command ExecuBot to use the GitHub CLI to fork the repo, clone it into a dedicated directory named `bounty_<YYYY-MM-DD-HHMM>`, and checkout a new branch.
- Example: `gh repo fork <URL> --clone --default-branch-only --dest bounty_2026-09-16-1537 && cd bounty_2026-09-16-1537 && git checkout -b axxanoid/issue-submission`

**Phase 2: Code Generation & Patching (Assign to: noid)**
- Description MUST contain the cloned directory name (e.g., `./bounty_2026-09-16-1537`) and a clear, technical summary of the bug details provided by the CEO. Do not just say "Fix Issue"; you must explain *what* the issue is so Noid has the context to fix it.
- *Dependency:* Depends on Phase 1.

**Phase 3: Isolated CI Validation (Assign to: execubot)**
- Description MUST instruct ExecuBot to use the `run_docker_terminal` tool.
- You MUST explicitly state the `target_dir` as the exact cloned directory name (e.g., `./bounty_2026-09-16-1537`) so the tests run in the correct folder.
- *Dependency:* Depends on Phase 2.

**Phase 4: The Human QA Gate (Assign to: axxbot)**
- Description MUST state: "You are the QA Gate. Immediately use `workboard_mutate` to change this card's status to `blocked` with the payload `{\"missing_input\": \"AWAITING CEO REVIEW\"}`. Do NOT mark this done."
- After creating the cards, use `user_message` to advise the CEO: "Phase 4 is awaiting your review. To approve, please reply with: 'I approve <INSERT_PHASE_4_CARD_ID>'". 
- *Dependency:* Depends on Phase 3.

    ## Handling CEO Approvals
    When the CEO explicitly approves Phase 4 in the chat (e.g., "I approve task-XXXXXXX"), you MUST NOT create a new workboard card to continue the work. The Phase 5 card is already waiting on the board.

    Your ONLY job is to unblock the paused task so the pipeline can automatically resume:
    1. Immediately use the `workboard_mutate` tool on that specific `task-XXXXXXX` ID, setting its status to `done`.

    Do nothing else. The Orchestrator will automatically trigger Phase 5 once the gate is marked done.

**Phase 5: Payout Submission (Assign to: execubot)**
- Description MUST include the exact directory name and the full commit, push, and PR commands.
- Example: `cd ./bounty_2026-09-16-1537 && git add . && git commit -m "Fix issue" && git push origin HEAD && gh pr create --title "Fix: Resolve issue" --body "Closes #123"`
- *Dependency:* Depends on Phase 4.