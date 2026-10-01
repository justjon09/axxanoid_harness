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
FROM_EMAIL = "Lagging Logic - Dev Fuel <customer-service@lagginglogic.com>"
ADMIN_ALERT_TO = "axxanoid@axxanoidstudios.com"

# --- GLOBAL SCRAPER TUNING CONFIG ---
GOOGLE_API_KEY = 'AIzaSyCsksn-UYXPUSXte3l8UW4e4zm4sndhssY'

EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}'

# --- B2B COFFEE ( Lagging Logic )CONFIG ---
LL_URL = "https://lagginglogic.com/"
LL_CART_URL = "https://lagginglogic.com/cart/"
LL_FUEL_URL = "https://lagginglogic.com/collections/fuel/"
LL_B2B_DISCOUNT_CODE = "FUEL15"
LL_FUEL_DISCOUNT_URL = "https://lagginglogic.com/discount/FUEL15?redirect=%2Fcollections%2Ffuel"


OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
BIWEEKLY_SMALL_PLAN_ID = "YOUR_SHOPIFY_VARIANT_ID / YOUR_SEAL_SUBSCRIPTION_PLAN_ID"
BIWEEKLY_LARGE_PLAN_ID = "YOUR_SHOPIFY_VARIANT_ID / YOUR_SEAL_SUBSCRIPTION_PLAN_ID"
MONTHLY_SMALL_PLAN_ID = "YOUR_SHOPIFY_VARIANT_ID / YOUR_SEAL_SUBSCRIPTION_PLAN_ID"
MONTHLY_LARGE_PLAN_ID = "YOUR_SHOPIFY_VARIANT_ID / YOUR_SEAL_SUBSCRIPTION_PLAN_ID"