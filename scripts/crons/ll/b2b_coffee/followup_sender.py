import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time
import random
import html
import secrets
import config
from datetime import datetime

def get_followup_leads(pitch_type="5day"):
    """Gets Free listings based on the pitch type. WP handles exact timeframe filtering via meta_query."""
    print(f"[*] Fetching {pitch_type} followup leads from WordPress...")
    
    # Passing per_page=10 to limit the batch exactly as you requested
    params = {
        'per_page': 10, 
        'status': 'publish',
        f'needs_{pitch_type}_pitch': 'true',
        'nocache': time.time()
    }
    
    response = requests.get(config.URL_LISTINGS, params=params, auth=config.AUTH)
    listings = response.json()
   
    targets = []
    today = datetime.now()
    target_days = 5 if pitch_type == "5day" else 30
    
    for item in listings:
        meta = item.get('meta', {})
        email = meta.get('contact_email', '')
        sent_date_str = meta.get('email_sent_date', '')
        
        if email and sent_date_str:
            try:
                sent_date = datetime.strptime(sent_date_str, "%Y-%m-%d")
                days_passed = (today - sent_date).days
                
                # Check timeframe
                if days_passed >= target_days:
                    targets.append({
                        'id': item['id'],
                        'title': html.unescape(item['title']['rendered']),
                        'email': email,
                        'link': item.get('link', '')
                    })
            except ValueError:
                continue 
            
    print(f"[*] Found {len(targets)} leads ready for the {pitch_type} pitch.")
    return targets

def send_followup_email(target, pitch_type):
    """Generates the token, appends it to Ego Trap link, and sends email."""
    token = secrets.token_urlsafe(16)
    tokenized_url = f"{target['link']}?axx_ft={token}"
    
    if pitch_type == "5day":
        subject = f"Action Required: Claim your 30-Day Free Trial for {target['title']}"
        body = f"""Hi team,\n\nWe reached out recently when your profile on the Average Stoner Directory went live. Because you haven't claimed it yet, we want to offer you a 30-day free trial of our Premium 'The Connect' tier.\n\nClick here to securely view your profile and activate your free trial:\n{tokenized_url}\n\nBest,\nThe Average Stoner Team"""
    else:
        subject = f"Final Notice: Free Trial Offer Expiring for {target['title']}"
        body = f"""Hi team,\n\nIt has been 30 days since your local business profile went live. This is our final reach-out before your 30-day free trial offer expires.\n\nClick here to securely unlock the trial on your profile:\n{tokenized_url}\n\nBest,\nThe Average Stoner Team"""

    msg = MIMEMultipart()
    msg['From'] = config.FROM_EMAIL
    msg['To'] = target['email']
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"    -> [SUCCESS] {pitch_type} email sent to {target['email']}")
        return token 
    except Exception as e:
        print(f"    -> [!] SMTP Error: {e}")
        return False

def update_wp_status(listing_id, token, pitch_type):
    """Updates WP to save the token and mark the specific email as sent."""
    meta_key = "email_5day_sent" if pitch_type == "5day" else "email_30day_sent"
    payload = {"meta": {meta_key: True, "_axx_free_trial_token": token}}
    # TO-DO create dedicated route
    requests.post(f"{config.URL_LISTINGS}/{listing_id}", json=payload, auth=config.AUTH)

if __name__ == "__main__":
    # Process 5-Day Loop
    leads_5day = get_followup_leads("5day")
    for lead in leads_5day:
        print(f"\n--- 5-Day Pitch: {lead['title']} ---")
        token = send_followup_email(lead, "5day")
        if token: update_wp_status(lead['id'], token, "5day")
        time.sleep(random.uniform(5, 15))
        
    # Process 30-Day Loop
    leads_30day = get_followup_leads("30day")
    for lead in leads_30day:
        print(f"\n--- 30-Day Pitch: {lead['title']} ---")
        token = send_followup_email(lead, "30day")
        if token: update_wp_status(lead['id'], token, "30day")
        time.sleep(random.uniform(5, 15))