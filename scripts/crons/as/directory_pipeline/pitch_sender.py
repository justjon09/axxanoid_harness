import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import config
import time
import random
import html
from datetime import datetime

def get_unpitched_leads():
    """Gets Free listings that have an email but haven't been pitched."""
    print("[*] Fetching leads to pitch from WordPress...")
   # Send needs_pitch to WP, and append a timestamp to bust server caching
    params = {
        'per_page': 50, 
        'status': 'publish',
        'needs_pitch': 'true',
        'nocache': time.time()
    }
    
    response = requests.get(config.URL_LISTINGS, params=params, auth=config.AUTH)
    listings = response.json()
   
    targets = []
    for item in listings:
        meta = item.get('meta', {})
        status = meta.get('listing_status', 'Free')
        email = meta.get('contact_email', '')
        sent_date = meta.get('email_sent_date', '')
        
        if status == 'Free' and email and not sent_date:
            targets.append({
                'id': item['id'],
                'title': html.unescape(item['title']['rendered']),
                'email': email,
                'city': meta.get('google_city', 'your city'),
                'link': item.get('link', '')
            })
            
    print(f"[*] Found {len(targets)} unpitched leads.")
    return targets

def generate_ai_opener(name, city):
    prompt = f"Write a 2-sentence conversational email intro congratulating '{name}' in {city} for being featured on the Average Stoner Directory. Keep the tone professional but highly enthusiastic. Do not use quotes or greetings. Just the two sentences."
    try:
        response = requests.post(
            "http://127.0.0.1:8080/v1/chat/completions",
            json={
                "model": "llama-3-groq-8b-tool-use",
                "messages": [
                    {'role': 'system', 'content': 'You are a critical part of a workflow. Your response are programatically passed to a database and need to adhere to strict formatting. Never use greetings, or quotes. Output ONLY the raw 2-sentence email intro .'},
                    {'role': 'user', 'content': prompt}
                ]
            },
            timeout=120
        )
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content'].strip(' "')
    except Exception as e:
        print(f"    [!] LLM Error: {e}")
        return f"We recently audited the local search rankings in {city} and featured {name} as a top-rated shop!"  

def send_email(target):
    """Compiles the email and sends it via SMTP."""
    ai_opener = generate_ai_opener(target['title'], target['city'])
    
    # The Grift Pitch
    body = f"""Hey team,

{ai_opener}

Your business profile is officially live. You can view your current placement and community ratings here:
{target['link']}

Right now, your profile is listed as "Unverified." Your local competitors use our platform to lock in the official 'The Connect' badge and dominate local search traffic. 

Claiming your profile allows you to permanently pin your shop to the top of the search results, control your brand's narrative, and unlock direct concierge updates for your imagery and business hours.

Click "Claim & Upgrade" directly on your profile to secure your ranking before your competitors take your spot.

Best,
The Average Stoner Team
https://www.averagestoner.com/directory
"""

    msg = MIMEMultipart()
    msg['From'] = config.FROM_EMAIL
    msg['To'] = target['email']
    msg['Subject'] = f"Your listing for {target['title']} is live!"
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"    -> [SUCCESS] Email sent to {target['email']}")
        return True
    except Exception as e:
        print(f"    -> [!] SMTP Error sending to {target['email']}: {e}")
        return False

def mark_as_pitched(listing_id):
    """Updates the WP database so we don't double-email them."""
    today = datetime.now().strftime("%Y-%m-%d")
    payload = {"meta": {"email_sent_date": today}}
     # TO-DO create dedicated route
    requests.post(f"{config.URL_LISTINGS}/{listing_id}", json=payload, auth=config.AUTH)

if __name__ == "__main__":
    leads = get_unpitched_leads()
    for lead in leads:
        print(f"\n--- Pitching: {lead['title']} ---")
        if send_email(lead):
            mark_as_pitched(lead['id'])
        time.sleep(random.uniform(10, 20)) # Respect SMTP rate limits