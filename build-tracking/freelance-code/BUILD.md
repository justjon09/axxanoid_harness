# FREELANCE CODE Human in the Loop Build and Instructions

# FREELANCE CODE - Project Overview 
1. Mapping the Bounty Pipeline
Instead of a single bot trying to juggle context, your specialized agents handle the lifecycle asynchronously:
- Ingestion: You paste the GitHub issue URL into the Command Center; AxxBot reads it and spawns the sub-tasks.
- Setup & Code: ExecuBot clones the repo and configures the environment, while Noid analyzes the files and writes the patch.
- Validation: ExecuBot runs the test suite; Axxanoid's native self-healing loop automatically catches non-zero exit codes and forces Noid to iterate until the suite passes.
- The Gate: You review the final diff in the UI, and ExecuBot pushes the PR via the GitHub CLI to trigger the payout.

2. The Execution Sandbox
Running untrusted open-source code (like random npm install scripts) directly on your Mac is a massive security risk. We will adapt your Docker concept directly into ExecuBot's lane.
- The Tool: We will build a run_docker_terminal tool for ExecuBot.
- The Isolation: Instead of executing in axx_env, ExecuBot mounts the specific bounty workspace into an ephemeral Docker container to run the tests safely.
- The Cleanup: Once the exit code returns 0, the container is destroyed automatically, leaving your host machine perfectly clean.

3. The New Skill Playbooks
To make this autonomous, we just need to teach your agents the rules of the bounty game. We will create two new files:
- skills/custom/bounty_hunter.md: Instructs AxxBot on how to parse GitHub issues and assign the proper repository tasks.
- skills/custom/docker_ci_runner.md: Instructs ExecuBot to run all unknown test suites inside the Docker container rather than the local shell.

4. Market Selection Strategy
To maximize your ROI and minimize hallucinations, stick to binary, verifiable outcomes:
- Target repositories with existing, green CI/CD pipelines so Noid has a strict mathematical baseline to test against.
- Filter for bug, refactor, or flaky-test labels where the success criteria are absolute.
- Avoid vague "feature" requests that require subjective human design choices or lack test coverage.

Let's ground the financial reality first, build out your selection matrix, and then define exactly how your agents will handle the Git operations and Docker isolation.

1. Getting Paid: The Stripe Connect Standard
You cannot route open-source bounties through your Shopify site or a custom high-risk payment processor. Platforms like Algora, Opire, and Boss.dev hold the client's bounty in escrow. When a repository maintainer merges your PR, the platform API programmatically releases the funds via Stripe Connect directly to your bank account. You must set up a Stripe Connect account linked to your GitHub profile to participate; it is the non-negotiable industry standard for automated developer payouts.

2. Market Selection Strategy
To make this pipeline autonomous, you must completely avoid subjective tasks. Your AI agents need absolute mathematical certainty to know if they succeeded.
- Target Binary Outcomes: Only accept issues tagged with bug, refactor, type-fix, or test-coverage.
- Require Active CI/CD: The target repository must have passing GitHub Actions. Noid needs a pre-existing, strict test suite to validate his patches against.
- Filter for Recency: Sort by "Recently Funded." Do not waste compute on 6-month-old issues where the maintainer is unresponsive.
- Avoid Feature Creep: Reject requests for "New UI design" or "Add a dashboard." Subjective human approval breaks the automated testing loop.

3. Automating Git Operations
You do not need a custom tool to handle Git operations. Because ExecuBot has access to run_terminal, he can leverage the standard git and GitHub CLI (gh) binaries already installed on your Mac. We will simply encode the exact sequence (clone, branch, commit, push, PR) into AxxBot's bounty_hunter playbook. You will act as the final human QA gate before ExecuBot fires the gh pr create command.

4. The Bounty Pipeline Assets
To bring this online, we need to inject three new files into your framework:
- tools/custom/run_docker_terminal.ts: A tool that bind-mounts your workspace into an ephemeral Docker container (e.g., node:20 or python:3.11) to execute untrusted test suites safely.
- skills/custom/bounty_hunter.md: The master playbook instructing AxxBot how to parse a GitHub URL, delegate cloning, assign code generation, and pause for your final diff review.
- skills/custom/docker_ci_runner.md: The playbook instructing ExecuBot to strictly use the Docker tool for third-party execution.


# FREELANCE CODE - BUILD PLAN
(Note: Ensure you actually have Docker Desktop or the Docker daemon running on your Mac before ExecuBot tries to use this tool, otherwise the spawn command will throw a "docker not found" or "daemon not running" error).
- UI integration ? (see diff or use ide)
- Tools
- Skills
- Integrations
# FREELANCE CODE - TARGET SELECTION WALKTHRU
- base rules
- profit rules
- comlexity guidelines
- the double check
# FREELANCE CODE - GIT PAID 
- From selection to money step by step

# FREELANCE CODE - BUILD PROCESS (LIVE)
1. Build the Docker Terminal Tool
- tools/custom/run_docker_terminal.ts
2. Give ExecuBot the Keys
- "run_docker_terminal": true (configs/system_control.json)
- "run_docker_terminal" (agents/execubot/config.json)


- Active focus: Ensure you actually have Docker Desktop or the Docker daemon running on your Mac:

