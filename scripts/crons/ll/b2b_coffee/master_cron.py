import subprocess
import sys
import time
from datetime import datetime
import os

def run_script(script_name):
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Executing {script_name}...")
    try:
        subprocess.run([sys.executable, script_path], check=True)
    except subprocess.CalledProcessError as e:
        print(f"[!] {script_name} crashed with error code {e.returncode}")

def run_pipeline(outreach_loops=3):
    print("\n" + "="*50)
    print("STARTING B2B COFFEE AUTOMATION PIPELINE")
    print("="*50)
    
    # Scrape Overpass API (Loopable via Command Brain)
    for i in range(outreach_loops):
        print(f"\n--- B2B Coffee Scrape Cycle {i+1} of {outreach_loops} ---")
        run_script("scraper.py")
        
        # Rest briefly between matrix requests so we don't hammer the WP API
        if i < outreach_loops - 1:
            print("    [Zzz] Matrix cool-down for 15 seconds...")
            time.sleep(15)

    run_script("email_scrubber.py")
    run_script("pitch_sender.py")
    run_script("followup_sender.py")
    run_script("renewal_sender.py")
    run_script("ticket_alerts.py")
    
    print("\n[✓] Pipeline complete. Going back to sleep until the next scheduled run.")
    print("="*50 + "\n")

if __name__ == "__main__":
    run_pipeline(outreach_loops=3)