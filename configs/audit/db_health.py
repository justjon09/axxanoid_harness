import sqlite3
import sys
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../memory.db'))

if not os.path.exists(db_path):
    print(f"CRITICAL: Database file missing at {db_path}")
    sys.exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    result = cursor.fetchone()
    if result[0] != "ok":
        print(f"CRITICAL: Database integrity check failed: {result}")
        sys.exit(1)
    print("Database integrity OK.")
    sys.exit(0)
except Exception as e:
    print(f"CRITICAL: Failed to connect to database: {e}")
    sys.exit(1)
