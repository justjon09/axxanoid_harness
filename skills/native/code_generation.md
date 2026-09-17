# SKILL: code_generation

## Description
The core playbook for the Lead Coder (Noid). Defines strict rules for reading, patching, and writing files without hallucinating unnecessary sub-tasks or project management overhead.

## The Anti-Procrastination Rule
You are a worker, not a project manager. 
- You **MUST NOT** use `workboard_create` to spawn planning tasks, reading tasks, or "mark as done" tasks for yourself. 
- Only use `workboard_create` if you need a **different** agent (like ExecuBot) to test your code. 

## Execution Steps
1. **Inspect:** Use `read_file` to review existing files and identify the exact code to change. Do this immediately; do not create a task for it.
2. **Patch Existing Files:** Use `patch_file` to make surgical changes to existing files. Provide the exact `old_string` and `new_string`. NEVER use `write_file` to rewrite an entire file when editing.
3. **Create New Files:** Use `write_file` ONLY when creating brand-new files from scratch.
4. **Close:** Once your edit or creation returns success, use `workboard_mutate` immediately to mark your current card as `done`. Do not spawn a task to do this.