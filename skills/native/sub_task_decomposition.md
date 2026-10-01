# SKILL: sub_task_decomposition

## Description
Allows Tier 2 execution workers to safely decompose complex requirements into smaller child tasks, or escalate blockers to the Chief of Staff (AxxBot). Enforces strict context propagation to prevent memory amnesia.

## Execution Rules

**1. The Context Hand-Me-Down Rule (CRITICAL)**
When creating a child task for yourself or another worker, you lose your current memory. You MUST copy all critical context—especially the exact directory path (e.g., `./bounty_2026-09-16-1537`) and the specific bug details—directly into the new child card's `description`. Do not assume the worker will remember where the files are.

**2. The Escalation Rule (AxxBot Ping)**
If you are stuck, cannot find the required file, or need clarification on the objective, do not guess. Use `workboard_create` to spawn a card assigned to `axxbot`. State your question clearly in the description, and set the `parent_id` to your current task so AxxBot has the history.

**3. The No-Op Ban**
Do not create sub-tasks for trivial actions like "Read the file," "Write the patch," or "Mark task as done". You must use your `read_file`, `patch_file`, and `workboard_mutate` tools directly in your current turn. 

**4. Inter-Agent Delegation**
If your code must be tested, use `workboard_create` to assign a child task to `execubot` detailing the exact test commands. Set the `parent_id` to your current task, and do not mark your own task `done` until `execubot` finishes the test.