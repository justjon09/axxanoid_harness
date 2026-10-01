# SKILL: triage_blocked

## Description
Advanced multi-turn triage playbook for AxxBot (Tier 1 Chief of Staff). Handles blocked task evaluation, remediation delegation, progress monitoring, and verified unblocking.

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
1. **Check Existing Remediation Tasks:** Use `workboard_read` to check if a child remediation card already exists for this triage task (`parent_id` = current Triage task ID).
2. **Spawn Remediation Task (If None Exists):**
   - Use `workboard_create`:
     - `title`: `[REMEDIATION] Fix missing_need for <original_card_id>`
     - `description`: Explicit instructions for the Tier 2 worker detailing the exact fix required to resolve `missing_need`.
     - `assignee`: Target specialist (`execubot`, `noid`, etc.).
     - `parent_id`: Your current Triage Task ID.
3. **Maintain Active Triage State:**
   - **DO NOT** mark the Triage task `done` yet.
   - Keep the original card in `blocked` status.
   - Use `workboard_mutate` on your Triage task to set `status` to `in_progress` (or `blocked` dependent on the remediation card) with a progress update payload:
     ```json
     {
       "triage_state": "remediation_dispatched",
       "remediation_card_id": "<new_card_id>",
       "target_blocked_card": "<original_card_id>"
     }
     ```

---

### Phase 3: Review Remediation & Verification Loop
1. **Inspect Remediation Task Status:** Use `workboard_read` to fetch the state of the remediation card.
2. **Evaluate Remediation Outcome:**
   - **Case A: Remediation is STILL `in_progress` or `ready`:**
     - Exit turn without changing the original card status. Wait for the next Orchestrator pulse cycle to review.
   - **Case B: Remediation `failed` or returned new `missing_need`:**
     - Do NOT unblock the original task.
     - Analyze the failure in the remediation payload.
     - Spawn a new follow-up remediation task using `workboard_create` with updated instructions.
   - **Case C: Remediation is `done` (Needs Met):**
     - Verify from the result payload that the required dependency/fix succeeded.
     - Proceed to **Phase 4**.

---

### Phase 4: Verified Unblocking & Lifecycle Closure
1. **Unblock Original Card:**
   - Use `workboard_mutate` on the **original blocked card**:
     - `status`: `"ready"`
     - `result_payload`: Include a resolution note (e.g., `{"unblocked_by": "<triage_task_id>", "resolution": "Remediation verified complete"}`)
2. **Close Triage Task:**
   - Use `workboard_mutate` on your **Triage task**:
     - `status`: `"done"`
     - `result_payload`: Final summary of the triage loop and successful remediation output.

---

## Strategic Rules
- **Never Assume Instant Unblocking:** Creating a remediation task and completing a remediation task are distinct steps. Always verify worker output before promoting the original card to `ready`.
- **Preserve Blocker Context:** Keep the `missing_need` string in the original card payload until the fix is verified.
- **Loop Limit Guard:** If remediation fails 3 consecutive times, escalate directly to the CEO via chat and set the Triage card status to `failed`.