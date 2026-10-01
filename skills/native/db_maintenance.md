# SKILL: db_maintenance
When maintaining SQLite databases, always utilize Write-Ahead Logging (WAL) safe commands. Use `VACUUM` for optimization only when no other agents are writing.
