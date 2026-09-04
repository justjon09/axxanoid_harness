import sqlite3
import sys
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../memory.db'))

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Identify tasks stuck in 'in_progress' for over an hour
    cursor.execute('''
        SELECT id, title, assignee, updated_at 
        FROM workboard_cards 
        WHERE status = 'in_progress' 
        AND updated_at < datetime('now', '-1 hour')
    ''')
    
    stalled = cursor.fetchall()
    
    if stalled:
        print("WARNING: Found stalled tasks blocking the Workboard!")
        for task in stalled:
            print(f"Task {task[0]} ('{task[1]}') assigned to {task[2]} stalled since {task[3]}")
        sys.exit(1)
    else:
        print("Workboard is clear. No stalled tasks found.")
        sys.exit(0)
        
except Exception as e:
    print(f"CRITICAL: Failed to query tasks: {e}")
    sys.exit(1)
