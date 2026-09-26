import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time
import html
import config

def check_open_tickets():
    print("[*] Checking for open Update Requests...")
    response = requests.get(config.URL_TICKET_ALERT, auth=config.AUTH)
    return response.json()

def send_admin_alert(count, oldest_date):
    subject = f"Directory Alert: {count} Open Update Requests"
    body = f"You currently have {count} unresolved profile update requests pending in the WordPress Admin.\n\nThe oldest open request is from: {oldest_date}.\n\nLog in to resolve them: https://www.averagestoner.com/wp-admin/edit.php?post_type=axx_dir_ticket"

    msg = MIMEMultipart()
    msg['From'] = f"Directory System <{config.SMTP_USER}>"
    msg['To'] = config.ADMIN_ALERT_TO
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print("    -> [SUCCESS] Alert sent.")
    except Exception as e:
        print(f"    -> [!] Failed to send alert: {e}")

def get_queued_messages():
    print("[*] Checking WordPress for outbound Concierge Ticket messages...")
 
    params = {
        'per_page': 50,
        'status': 'publish',
        'needs_dispatch': 'true',
        'nocache': time.time()
    }
    
    response = requests.get(config.URL_TICKETS, params=params, auth=config.AUTH)
    return response.json()

def dispatch_ticket_message(ticket):
    meta = ticket.get('meta', {})
    email = meta.get('contact_email', '')
    status = meta.get('ticket_status', 'open').upper()
    admin_message = meta.get('ticket_message', '')
    title = html.unescape(ticket['title']['rendered'])

    if not email or not admin_message:
        print(f"    -> [!] Skipping {title}: Missing email or message content.")
        return False

    # Compile the Concierge Email
    subject = f"Support Update: {title}"
    body = f"""Hi there,

Here is an update regarding your profile modification request for {title}.

Current Status: {status}

Message from the Concierge Team:
{admin_message}

If you have any further questions, please feel free to reply directly to this email.

Best,
The Average Stoner Concierge Team
https://www.averagestoner.com/directory
"""

    msg = MIMEMultipart()
    msg['From'] = config.FROM_EMAIL
    msg['To'] = email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"    -> [SUCCESS] Message dispatched to {email}")

        # Post-back to WP to uncheck the "Send Message" box
        payload = {
            "meta": {
                "send_ticket_message": False # Boolean False unchecks the box in WP
            }
        }
        res = requests.post(f"{config.URL_TICKETS}/{ticket['id']}", json=payload, auth=config.AUTH)
        
        if res.status_code == 200:
            print("    -> [SUCCESS] WordPress flag cleared.")
            return True
        else:
            print(f"    -> [!] API Error clearing WP flag: {res.status_code}")
            return False
    except Exception as e:
        print(f"    -> [!] Transmission Error: {e}")
        return False

if __name__ == "__main__":
    open_tickets = check_open_tickets()

    count = open_tickets.get('count', 0)
    oldest = open_tickets.get('oldest_date', 'N/A')

    if count > 0:
        print(f"[*] Found {count} open tickets. Alerting admin.")
        send_admin_alert(count, oldest)
        time.sleep(3)
    else:
        print("[*] No open tickets. All clear.")

    ticket_messages = get_queued_messages()
    if not ticket_messages:
        print("[*] No outbound messages pending.")
    else:
        for t in ticket_messages:
            print(f"\n--- Processing Message for Ticket ID: {t['id']} ---")
            dispatch_ticket_message(t)
            time.sleep(3)










