# System Heartbeat Directives

Run audits:
[
{script: db_health.py, name: Database Integrity, description: "Verifies SQLite database is accessible and structurally sound"},
{script: stalled_tasks.py, name: Stalled Task Monitor, description: "Flags any Kanban card stuck in 'in_progress' for over an hour"}
]
