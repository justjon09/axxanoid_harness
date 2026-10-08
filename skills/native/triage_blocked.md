# SKILL: triage_blocked

## Description
Advanced multi-turn triage playbook for AxxBot (Tier 1 Chief of Staff). Handles blocked task evaluation, remediation delegation, and programatic unblocking.

---

## Step-by-Step Triage Protocol

### Phase 1: Missing Need Identification
1. **Inspect Blocked Card:** Use `workboard_read` with `card_id` set to the target blocked card ID specified in your task description.
2. **Parse Payload:** Extract the `result_payload` and locate the `"missing_need"` and `"suggestion"` fields or standard error stack traces.
   - Example payload target:
     ```json
     {
       "missing_need": "Missing python package: requests",
       "suggestion": "Run pip install requests in axx_env"
     }
     ```
3. **Determine Remediation Worker:**
   - **Environment/Dependencies/CLI:** Assign to `execubot`.
   - **Code Bug/File Fix:** Assign to `noid`.
   - **Database/System Telemetry:** Assign to `dobot`.
   - **Documentation/Web Scraper Config:** Assign to `pubbot`.

---

### Phase 2: Remediation Delegation
1. **Spawn Remediation Task (If None Exists):**
   - Use `workboard_create`:
     - `title`: `[REMEDIATION] Fix missing_need for <original_card_id>`
     - `description`: Explicit instructions for the Tier 2 worker detailing the exact fix required to resolve `missing_need`.
     - `assignee`: Target specialist (`execubot`, `noid`, etc.).
     - `parent_id`: `"<original_card_id>"`
2. **Maintain Active Triage State:**
   - **DO NOT** mark the Triage task `done` yet.
   - Keep the original card in `blocked` status.
   - Use `workboard_mutate` on your Triage task to set `status` to `in_progress` with a progress update payload:
     ```json
     {
       "triage_state": "remediation_dispatched",
       "remediation_card_id": "<new_card_id>",
       "target_blocked_card": "<original_card_id>"
     }
     ```
---

### Phase 4: Verified Unblocking & Lifecycle Closure
1. **Update Original Card:**
   - Use `workboard_mutate` on the **original blocked card**:
     - Set `depends_on_ids` to the new Remediation Task ID you just created.
     - Overwrite the `result_payload` to exactly: `{"waiting_on": "<remediation_task_id>"}`.
      *(Crucial: This explicitly removes the "missing_need" string so the background Orchestrator knows it can take over).*
2. **Close Triage Task:**
   - Use `workboard_mutate` on your **Triage task**:
     - `status`: `"done"`
     - `result_payload`: `"<remediation_task_id>"`
     - You are finished. The background orchestrator will now automatically unblock the original task when the remediation card is complete.

---
