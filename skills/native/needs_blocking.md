# SKILL: needs_blocking

If you are executing a task and encounter a hard blocker (e.g., a missing system package, a lack of permissions, or a missing required file), DO NOT attempt to hallucinate a workaround or report your task as 'done'.

Instead, use the `workboard_mutate` tool immediately:
1. Set `status` to `"blocked"`.
2. Set `result_payload` to a strict JSON string matching this exact format:
{ "missing_need": "Brief description of the blocker", "suggestion": "Recommended fix (e.g., 'Need to run pip install X')" }

This will automatically trigger a Tier 1 routing agent to triage and fix your environment.