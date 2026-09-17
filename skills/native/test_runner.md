# SKILL: test_runner

## Description
Standard operating procedure for executing test suites and verifying code. Ensures agents safely report test outcomes without crashing the JSON parser with massive terminal logs.

## Execution & Reporting Protocol

**1. Execute the Test**
Run the required test suite using the appropriate tool (`run_terminal` or `run_docker_terminal`). 

**2. Analyze the Output (DO NOT DUMP RAW TEXT)**
You must read the `stdout` and `stderr` internally, but you are **strictly forbidden** from copying and pasting raw terminal logs, stack traces, or code blocks into your `workboard_mutate` payload. Massive text blocks will crash your JSON syntax parser.

**3. Format the Result Payload**
When you mutate the card to `done` (if exit code 0) or `blocked`/`failed` (if exit code > 0), your `result_payload` must be a brief, structured summary:
- **Test Name/Suite:** (e.g., "Mocha Express Suite")
- **Metrics:** (e.g., "1257 passing, 0 failing")
- **Primary Error (If Failed):** Write a 1-sentence summary of the specific failure (e.g., "SyntaxError on line 42: missing bracket"). Do not include the stack trace.

**Example Safe Payload:**
`{"status": "Tests passed successfully. 1257 passing. 0 vulnerabilities."}`