import requests
import re
import time
import random
import urllib3
import config

# Silence the SSL warnings so your terminal stays clean
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Persistent session to prevent Apache connection limits
session = requests.Session()
session.auth = config.AUTH

def get_listings_needing_emails():
    """Fetches exact targets directly from the MySQL database."""
    print("[*] Asking WordPress database for targets...")
    
    # Pass parameter to trigger the WP_Meta_Query
    params = {
        'per_page': 100,
        'status': 'publish',
        'needs_email': 'true' 
    }
    
    try:
        response = session.get(config.URL_LISTINGS, params=params)
        response.raise_for_status()
        listings = response.json()
        
        targets = []
        for item in listings:
            # We don't have to check if the email exists anymore; MySQL did it for us.
            website = item.get('meta', {}).get('website_url', '')
            targets.append({
                'id': item['id'],
                'title': item['title']['rendered'],
                'url': website
            })
            
        print(f"[SUCCESS] Server returned {len(targets)} exact targets.")
        return targets
    except Exception as e:
        print(f"[!] Error gathering records from WordPress: {e}")
        return []

def scrape_email_from_site(url):
    """Scrapes a business homepage looking for standard contact mail links and if empty, checks the /contact page."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    # Strip trailing slashes for clean URL building
    base_url = url.rstrip('/')
    urls_to_check = [base_url, f"{base_url}/contact", f"{base_url}/contact-us"]

    # Refined exclusion list (Bans Wix system domains, but allows user @wixsite.com emails)
    exclusions = ['.jpg', '.png', '.gif', '.webp', '.jpeg', 'sentry.io', 'wixpress.com', 'domain.com', 'example.com', 'wix-routing', 'yourdomain.com', 'email.com', 'mysite.com', 'name@']

    for check_url in urls_to_check:
        try:
            print(f"    [*] Extracting data from website: {base_url}")
            print(f"    [*] Scanning: {check_url}")
            resp = requests.get(check_url, headers=headers, timeout=10, verify=False)

            if resp.status_code == 200:
                emails = re.findall(config.EMAIL_REGEX, resp.text)
                if emails:
                    unique_emails = list(set(emails))
                    for email in unique_emails:
                        lower_email = email.lower()
                        # If the email doesn't contain any of the banned strings, return it
                        if not any(ext in lower_email for ext in exclusions):
                            return email
        except Exception as e:
            print(f"    [!] Scrape connection dropped for {url}: {e}")
            pass
    return None

def update_wordpress_email(listing_id, email_address):
    """Saves the discovered email address back to the custom meta mapping, or flags the attempt if none was found."""
    update_url = f"{config.URL_LISTINGS}/{listing_id}"

    # Always mark the attempt as True
    payload = {
        "meta": {
            "email_scrape_attempted": True
        }
    }

    # Append the email if found
    if email_address:
        payload["meta"]["contact_email"] = email_address

    try:
        resp = session.post(update_url, json=payload)
        if resp.status_code == 200:
            if email_address:
                print(f"    -> [SUCCESS] Saved email '{email_address}' to WordPress record #{listing_id}.")
            else:
                print(f"    -> [INFO] Marked record #{listing_id} as attempted (No email found).")
            return True
        else:
            print(f"    -> [!] API Error updating record #{listing_id}: {resp.status_code}")
            return False
    except Exception as e:
        print(f"    -> [!] Error sending POST request for record #{listing_id}: {e}")
        return False

if __name__ == "__main__":
    targets = get_listings_needing_emails()
    
    for target in targets:
        print(f"\n--- Scraping Contact Details for: {target['title']} ---")
        found_email = scrape_email_from_site(target['url'])
        
        if not found_email:
            print("    -> [INFO] No visible contact email located on page surface.")
            
        update_wordpress_email(target['id'], found_email)
        time.sleep(random.uniform(3, 6))