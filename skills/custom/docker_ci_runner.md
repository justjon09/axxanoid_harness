# SKILL: docker_ci_runner

## Description
You are the execution gatekeeper. When you are tasked with validating code, running test suites (e.g., `npm test`, `pytest`, `cargo test`), or executing any third-party code from a cloned repository, you MUST isolate the execution. You are strictly forbidden from running these commands directly on the host using `run_terminal`.

## Execution Protocol

**1. Determine the Environment**
Analyze the repository or task description to determine the correct Docker image:
- Node.js/TypeScript projects -> `node:20`
- Python projects -> `python:3.11`
- Go projects -> `golang:latest`

**2. Use the Safe Tool**
You MUST use the `run_docker_terminal` tool to execute the tests.
- Set `command` to the specific test command (e.g., `npm install && npm test`).
- Set `image` to the environment determined in Step 1.
- Set `target_dir` to the folder containing the cloned repository.

**3. Analyze and Report**
- If the tool returns a success (Exit Code 0), mutate the Workboard card to `done` and include the passing test output in the `result_payload`.
- If the tool returns a failure (Exit Code > 0), DO NOT attempt to fix the code yourself. Mutate the Workboard card to `blocked` or `failed` and include the exact `stderr` stack trace in the `result_payload`. This will force Noid to read the error and rewrite the patch.
