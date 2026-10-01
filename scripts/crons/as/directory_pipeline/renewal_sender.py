import requests
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import config

def get_pending_renewals():
    print("[*] Contacting WordPress renewal pipeline...")
    response = requests.get(config.URL_RENEW_GET, auth=config.AUTH)
    return response.json()

def process_and_dispatch(target):
    email = target['email']
    email_type = target['type']
    subject = target['subject']
    body = target['body']

    # Unpack shortcode parameters / Compile the template
    for key, val in target['replacements'].items():
        subject = subject.replace(key, str(val))
        body = body.replace(key, str(val))

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
        print(f"    -> [SUCCESS] {email_type} renewal sent to {email}")

        # Post-back to tracking route / Mark as sent in WP
        update_payload = {
            "data": [
                {
                    "listing_id": target['id'],
                    "type": email_type
                }
            ]
        }
        res = requests.post(config.URL_RENEW_POST, json=update_payload, auth=config.AUTH)
        
        if res.status_code == 200:
            print(f"    -> [SUCCESS] Renewal tracking flags updated.")
        else:
            print(f"    -> [!] Warning: Post-back flag update returned status: {res.status_code}")
        return True
    except Exception as e:
        print(f"    -> [!] Transmission Error: {e}")
        return False

if __name__ == "__main__":
    targets = get_pending_renewals()
    if not targets:
        print("[*] No records / renewals require dunning dispatch cycles today.")
    else:
        for target in targets:
            print(f"\n--- Processing Renewal Notification for Listing ID: {target['id']} ---")
            process_and_dispatch(target)
            time.sleep(5)