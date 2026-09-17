# SKILL: task_decomposition

## Description
Core orchestration playbook for the Chief of Staff (AxxBot). Defines how to translate CEO objectives into a Master Project Card and break it down into atomic, specialist-assigned child cards without losing critical context.

## Execution Rules

**1. The Master Project Card (The Source of Truth)**
Before creatng tier 2 tasks, you MUST use `workboard_create` to spawn a single Master Project Card and assign it to yourself. You MUST compile the CEO's instructions, pseudo-code, and requirements into the Master Project Card. This is your primary monitoring and management card.
- This card must include your own executive summary of the project
- This card must include project pathing relative to workspaces/shared (e.g. ./coffee_cron)
- This card must include a list of project inputs (e.g. Docs: ./coffee_cron/B2B Coffee Outreach Architecture.md and ./coffee_cron/plan.coral)
- This card must be referanced in all project cards (e.g. Master Project Card <cardID>)
- This guarantees Tier 2 workers have a physical source of truth to read from.

**2. Project Classification**
Analyze the Master Project Card you MUST decompose it into smaller, verifiable child tasks rather than attempting to lump everything into a single execution step.

**2. Specialist Routing**
Determine the actual nature of the work for each task. Assign them to the correct specialist based on their tool capabilities (e.g., assign to an agent with terminal access for testing, or an agent with file writing access for coding).

**3. EXPLICIT CONTEXT INJECTION (No Telephone Game)**
When creating the child tasks, you must point the worker directly to the source of truth.
Tier 2 workers cannot see the CEO's chat or your previous file reads. You MUST explicitly include the target data from the CEO's objective (the exact URL, the specific error log, or the target file path) into the child card's description so the Tier 2 worker knows exactly what to operate on.
- In the child card's description, explicitly command the worker to read the parent task (e.g., *"Use `workboard_read` on parent task <MASTER_CARD_ID> to read the project blueprint. Implement the 'External Configuration' phase exactly as written."*).
- Explicitly copy any exact file paths (e.g., `./coffee_cron/external_config.json`) into the child description so the worker knows exactly what file to write.

**4. The Domino Effect (Dependencies)**
Child tasks must be sequenced logically.
- Set the `parent_id` of all child cards to the ID of your Master Project Card.
- If a child task depends on another child task finishing first (e.g., code must be generated before it is tested), you MUST explicitly link them sequentially using the `depends_on_ids` parameter.