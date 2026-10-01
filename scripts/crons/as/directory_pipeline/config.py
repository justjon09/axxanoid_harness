# config.py
from requests.auth import HTTPBasicAuth

# --- WORDPRESS REST ENGINE CONFIG ---
WP_DOMAIN = "https://www.averagestoner.com"
WP_USER = "asdev"
WP_APP_PASSWORD = "wgNyaCdVDzmGoZY9fKPlnGey" # The password with no spaces
# Your new password for python-home is:  wgNy aCdV DzmG oZY9 fKPl nGey
AUTH = HTTPBasicAuth(WP_USER, WP_APP_PASSWORD)

# --- STANDALONE API URL MAPS ---
URL_LISTINGS        = f"{WP_DOMAIN}/wp-json/wp/v2/axx_dir_listing"
URL_TARGET_CONED    = f"{WP_DOMAIN}/wp-json/axx/v1/next-scrape-target"
URL_RENEW_GET       = f"{WP_DOMAIN}/wp-json/axx/v1/pending-renewals"
URL_RENEW_POST      = f"{WP_DOMAIN}/wp-json/axx/v1/update-renewals"
URL_TICKET_ALERT    = f"{WP_DOMAIN}/wp-json/axx/v1/open-tickets"
URL_TICKETS         = f"{WP_DOMAIN}/wp-json/wp/v2/axx_dir_ticket"

# --- GLOBAL SMTP DISPATCH CONFIG ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "axxanoid@axxanoidstudios.com"
SMTP_PASS = "fmmoaperrpfqnost"
FROM_EMAIL = "Average Stoner Directory <customer-service@averagestoner.com>"
ADMIN_ALERT_TO = "axxanoid@axxanoidstudios.com"

# --- GLOBAL SCRAPER TUNING CONFIG ---
GOOGLE_API_KEY = 'AIzaSyCsksn-UYXPUSXte3l8UW4e4zm4sndhssY'

EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}'
