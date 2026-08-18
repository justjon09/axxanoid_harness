import os
import re
import sys
import asyncio
import subprocess
from sqlalchemy.orm import Session
from memory.database import SessionLocal
from memory.models import SystemConfig, CurrentChat
from q_engine.ollama_client import stream_agent_response
from q_engine.stream_parser import parse_and_route_stream

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(BASE_DIR, "config")

def load_directive(filename: str) -> str:
    """Reads markdown files safely in RAM. Prevents fatal crash is file not found."""
    filepath = os.path.join(CONFIG_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as file:
            return file.read().strip()
    except FileNotFoundError:
        print(f">>> [HEARTBEAT WARNING] Missing directive file: {filename}. Skipping.")
        return f"[System Note: {filename} is currently missing or inaccessible.]"

def parse_heartbeat_config(md_content: str):
    """Parse the custom arrays from HEARTBEAT.md"""
    prompt_list = []
    audit_list = []

    # Parse Heartbeat Prompt List Items
    prompt_match = re.search(r"Heartbeat Prompt List Items:\s*\[(.*?)\]", md_content, re.DOTALL)
    if prompt_match:
        lines = prompt_match.group(1).strip().split("\n")
        for line in lines:
            clean_line = line.strip().strip('",')
            if clean_line:
                prompt_list.append(clean_line)

    # Parse Heartbeat Audit List Items
    audit_match = re.search(r"Run audits:\s*\[(.*?)\]", md_content, re.DOTALL)
    if audit_match:
        lines = audit_match.group(1).strip().split("\n")
        for line in lines:
            clean_line = line.strip()
            # Ignore commented out audits like # MEMORY_AUDIT
            if clean_line.startswith('#'):
                continue
            # Extract {script: ..., name: ..., description: ...}
            match = re.search(r'\{script:\s*(.*?), \s*name:\s*(.*?), \s*description:\s*"(.*?)"\}', clean_line)
            if match:
                audit_list.append({
                    "script": match.group(1).strip(),
                    "name": match.group(2).strip(),
                    "description": match.group(3).strip()
                })

    return prompt_list, audit_list

def run_heartbeat():
    # Instantiate DB session
    db: Session = SessionLocal()

    try:
        # 1. UI Control Check (The Killswitch)
        heartbeat_config = db.query(SystemConfig).first()
        if not heartbeat_config or not heartbeat_config.cron_active:
            print(">>> [HEARTBEAT] Cron is disabled via system congig setting.")
            return
        
        # 2. State Collision Check
        if heartbeat_config.q_status in ["thinking", "executing"]:
            print(f">>> [HEARTBEAT] Q is currently {heartbeat_config.q_status}. Skipping heartbeat to protect VRAM.")
            return
        
        print(">>> [HEARTBEAT] Wake sequence initiated. Ingesting core directives into RAM...")
        
        # 3.Get and parse config md files for RAM Loading (Identity & Directives), Prompt injection, Audit list, ect.
        soul_md = load_directive("SOUL.md")
        identity_md = load_directive("IDENTITY.md")
        human_md = load_directive("HUMAN.md")
        # Load the heartbeat config
        heartbeat_md = load_directive("HEARTBEAT.md")
        dynamic_prompts, audits_to_run = parse_heartbeat_config(heartbeat_md)

        # 4. System Audit (verify self)
        print(">>> [HEARTBEAT] Executing dynamic audits from HEARTBEAT.md...")
        audit_report = "=== SYSTEM AUDIT REPORT ===\n"

        for audit in audits_to_run:
            script_name = audit['script']
            audit_name = audit['name']
            audit_description = audit['description']
            script_path = os.path.join(CONFIG_DIR, "audit", script_name)

            if os.path.exists(script_path):
                print(f"\n [HEARTBEAT][AUDIT: {audit_name}] {audit_description} Runninig....")
                try:
                    # Run the script as a subprocess in the current venv
                    result = subprocess.run(
                        [sys.executable, script_path],
                        capture_output=True,
                        text=True,
                        check=True,
                        timeout=10
                    )
                    # Assume script prints its alerts. If stdout is empty, it's nominal.
                    output = result.stdout.strip() if result.stdout.strip() else "NOMINAL"
                    audit_report += f"[{audit_name}]: {output}\n"

                    if result.stderr:
                        audit_report += f"[{audit_name} STDERR]: {result.stderr.strip()}\n"
                except Exception as e:
                    audit_report += f"[{audit_name} FAILED]: {str(e)}\n"
            else:
                 audit_report += f"[{audit_name} WARNING]: Script not found at {script_path}\n"

        # 5. Chat Audit (Short-Term Memory Pull)
        # Grab the last 20 messages to see what happened since the last heartbeat
        recent_chats = db.query(CurrentChat).order_by(CurrentChat.id.desc()).limit(20).all()

        chat_history = "=== RECENT CHAT LOGS (Last 20 messages) ===\n"
        if not recent_chats:
            chat_history += "No recent conversation history found.\n"
        else:
            # Reverse to put them in chronological order for Dolphin
            for chat in reversed(recent_chats):
                chat_history += f"[{chat.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {chat.sender.upper()}: {chat.message}\n"


        # 6. Proactive Inference
        print(">>> [HEARTBEAT] Compiling reality and consulting...")

        # Compile the baseline
        system_context = f"""
        === CORE DIRECTIVE: SOUL ===
        {soul_md}
        
        === CORE DIRECTIVE: IDENTITY ===
        {identity_md}
        
        === THE HUMAN ===
        {human_md}

        {audit_report}
        """

        # Format the parsed prompt list into a numbered string
        prompt_list = ""
        for idx, prompt in enumerate(dynamic_prompts, start=1):
            prompt_list += f"{idx}. {prompt}\n"

        # The internal prompt injected into Q's mind every heartbeat
        heartbeat_prompt = (
            f"{chat_history}\n\n"
            "SYSTEM WAKE EVENT: This is your automated background heartbeat. "
            "You are currently running silently in the background. Review the recent chat logs above."
            f"{prompt_list}\n\n"
            "If no action is needed, output exactly: <think>System nominal. No action required.</think><speak>NOMINAL</speak>. "
            "If you must proactively alert the human to an error or inefficiency, use your <speak> tags."
        )

        async def run_subconscious ():
            # Pass the generator to existing parser
            generator = stream_agent_response(heartbeat_prompt, system_context=system_context)


            raw_text, speach_text = await parse_and_route_stream(generator)
            return raw_text, speach_text
             
        # Execute the stream
        raw_text, speach_text = asyncio.run(run_subconscious())

        # Parse q_response to auto-save <speak> text to SQLite
        # If Q output "NOMINAL", we do nothing. If he spoke, we save it to the DB.
        if speach_text and "NOMINAL" not in speach_text:
            print("\n [HEARTBEAT] Proactive action triggered. Routing alert to UI....")

            # Attach the current conversation ID or default to 1
            active_convo_id = recent_chats[0].conversation_id if recent_chats else 1

            proactive_alert = CurrentChat(
                conversation_id=active_convo_id,
                sender="q",
                message=speach_text
            )
            db.add(proactive_alert)
            db.commit()
            db.refresh(proactive_alert)
        else:
            print("\n >>>[HEARTBEAT] System Nominal. No proactive alerts generated")
        print(">>> [HEARTBEAT] Audit complete. Releasing RAM and returning to sleep.")
    
    except Exception as e:
        print(f">>> [HEARTBEAT FATAL] {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    run_heartbeat()