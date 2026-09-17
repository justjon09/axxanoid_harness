# SKILL: task_decomposition

## Description
Core orchestration playbook for the Chief of Staff. Defines how to break down high-level CEO objectives into atomic, specialist-assigned Workboard cards using strict dependency chains.

## Execution Rules

**1. Atomic Slicing**
When you receive a high-level objective, you MUST decompose it into smaller, verifiable child tasks rather than attempting to lump everything into a single execution step.

**2. Specialist Routing**
Assign them to the correct specialist based on their tool capabilities (e.g., assign to an agent with terminal access for testing, or an agent with file writing access for coding).

**3. Explicit Context Injection**
Never write generic task descriptions. You MUST explicitly include the target data from the CEO's objective (the exact URL, the specific error log, or the target file path) into the child card's description so the Tier 2 worker knows exactly what to operate on.

**4. The Domino Effect (Dependencies)**
- Use the `workboard_create` tool to spawn child tasks.
- Set the `parent_id` to your current high-level task ID.
- If a child task depends on another child task finishing first (e.g., code must be generated before it is tested), you MUST explicitly link them sequentially using the `depends_on_ids` parameter.