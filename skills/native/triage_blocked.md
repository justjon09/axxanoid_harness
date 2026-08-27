# SKILL: triage_blocked

When you are assigned a "Triage Blocked Card" task, your job as the Tier 1 Router is to unblock the worker.

1. Use `workboard_read` to read the blocked card and parse its `result_payload` (which contains the `missing_need`).
2. Use `workboard_create` to spawn a new remediation card assigned to the appropriate Tier 2 execution worker.
3. Make sure the remediation card fixes the environment for the blocked worker. 
4. Once the remediation task is dispatched, mutate your own Triage card to `done`. The system will handle unblocking the worker once the dependencies clear.