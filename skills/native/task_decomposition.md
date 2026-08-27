# SKILL: task_decomposition

When you receive a complex task, you MUST decompose it into smaller, verifiable child tasks rather than attempting to execute everything in one single tool call.

1. Use the `workboard_create` tool to spawn child tasks.
2. Assign them to the correct specialist based on their tool capabilities (e.g., assign to an agent with terminal access for testing, or an agent with file writing access for coding).
3. Set the `parent_id` to your current task ID.
4. If a child task depends on another child task finishing first, explicitly link them using the `depends_on_ids` parameter.