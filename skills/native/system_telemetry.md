# SKILL: system_telemetry

## Description
This skill defines the standard operating procedure for checking the health and resource utilization of the host machine (Apple Silicon Mac).

## Execution Steps
When instructed to perform a system audit or check telemetry, you MUST execute the following steps in order using the `run_terminal` tool:

1. **Check CPU and Memory:**
   - Command: `top -l 1 -s 0 | head -n 15`
   - Purpose: Captures a single snapshot of active processes, memory pressure, and CPU load.

2. **Check Disk Space:**
   - Command: `df -h /`
   - Purpose: Verifies available storage on the primary volume.

3. **Check Network Connections:**
   - Command: `netstat -an | grep LISTEN | head -n 10`
   - Purpose: Identifies open listening ports to verify daemon activity.

## Reporting
Once all commands have been executed successfully, compile the raw output into a concise markdown report and use the `workboard_mutate` tool to mark your task as `done`, injecting the report into the `result_payload`.