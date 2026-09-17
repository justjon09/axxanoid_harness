# SKILL: sandbox_execution

## Description
Safety and pathing guidelines for executing shell commands via `run_terminal`.

## Execution Rules
1. **The Global Sandbox:** You are already operating within the `axx_env` isolated virtual environment. You are strictly forbidden from running `python -m venv` or attempting to create new local virtual environments. 
2. **Absolute Pathing:** Ensure all paths map correctly. If you are executing a script, verify the file exists using `list_files` before blindly attempting to run it.
3. **Capture Output:** Always capture both `stdout` and `stderr` so the Orchestrator can log the exact state of the machine.