import requests
import json
import config
import time

def check_wp_duplicate(place_id):
    """Queries WordPress to see if this Place ID already exists."""
    # Custom registered parameter instead of meta_key/meta_value
    check_url = f"{config.URL_LISTINGS}?google_place_id={place_id}"
    try:
        response = session.get(check_url,  auth=config.AUTH)
        response.raise_for_status()
        if len(response.json()) > 0:
            return True
        return False
    except session.exceptions.RequestException as e:
        print(f"    [!] Error checking duplicates: {e}")
        # --- TRACE THE 429 HEADERS ---
        if e.response is not None:
            print("\n    [DEBUG] --- 429 Bouncer Identity ---")
            print(f"    Server Response Text: {e.response.text}")
            for key, value in e.response.headers.items():
                print(f"    {key}: {value}")
            print("    ------------------------------------\n")
        return False # Fail open, try to push anyway
    
def build_photo_url(photo_name):
    """Converts a Google Photo Name string into a direct Media URL."""
    if not photo_name:
        return ""
    return f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&maxWidthPx=800&key={config.GOOGLE_API_KEY}"

def fetch_google_places(query, page_token=None):
    """
    Scrapes the Google Places API for businesses matching the query. If page_token is provided, fetches the next page.
    """
    print(f"[*] Fetching targets for query: '{query}'...")
    
    endpoint_url = "https://places.googleapis.com/v1/places:searchText"

    # The New API requires POST headers and a FieldMask to specify what data to return
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.types,places.id,places.reviews,places.photos,places.websiteUri,places.nationalPhoneNumber,places.googleMapsTypeLabel,places.addressComponents,places.businessStatus,places.delivery,nextPageToken'
    }
    payload = {'textQuery': query}

    if page_token:
        payload['pageToken'] = page_token
    
    try:
        response = requests.post(endpoint_url, headers=headers, json=payload)
        response.raise_for_status() # Check for HTTP errors
        data = response.json()
       
        places = data.get('places', [])
        next_token = data.get('nextPageToken')
        print(f"[*] Found {len(places)} potential targets on this page.\n")
        return places, next_token
    except requests.exceptions.RequestException as e:
        print(f"[!] Error fetching from Google API: {e}")
        # Print the raw error payload from Google if it crashes
        if 'response' in locals() and response.text:
            print(f"[DEBUG] Raw Error: {response.text}")
        return [], None
    
# --- The AI Text Processor ---
def generate_description(name, address, query, reviews):
    """
    Uses local LLM to generate an SEO-friendly directory description based on real Google reviews.
    """
    print(f"[*] Waking up Local LLM to write description for: {name}...")

    # Extract text from up to 3 reviews
    review_texts = [r.get('text', {}).get('text', '') for r in reviews[:3] if r.get('text', {}).get('text', '')]
    review_context = " | ".join(review_texts) if review_texts else "No reviews available."

    prompt = f"Here are real customer reviews for a business named '{name}': {review_context}. Write a professional, 3-sentence SEO-friendly directory listing description for '{name}' located at '{address}'. Focus on it being a {query} and use the vibe of the reviews to make it factual. Do not include any pleasantries, conversational text, or quotes. Just output the raw description."

    try:
        response = requests.post(
            "http://127.0.0.1:8080/v1/chat/completions",
            json={
                "model": "llama-3-groq-8b-tool-use",
                "messages": [
                    {'role': 'system', 'content': 'You are a critical part of a workflow. Your response are programatically passed to a database and need to adhere to strict formatting. Never use conversational text, greetings, or quotes. Output ONLY the raw 3-sentence description.'},
                    {'role': 'user', 'content': prompt}
                ]
            },
            timeout=120
        )
        response.raise_for_status()
        print(f"    -> [SUCCESS] Description generated.")
        return response.json()['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"    -> [!] Error communicating with LLM: {e}")
        return "Local business listing."
   
# --- Parse to WordPress Payload ---
def parse_for_wordpress(raw_places):
    for place in raw_places:
        name = place.get('displayName', {}).get('text', 'Unknown')
        place_id = place.get('id', '')

        print(f"\n--- Processing: {name} ---")
        # print(f"\n--- place: {place} ---\n\n\n")

        # Duplicate Check
        if check_wp_duplicate(place_id):
            print(f"    [SKIP] Place ID {place_id} already exists in WordPress.")
            continue

        status = place.get('businessStatus', 'Unknown')
        if status in ['CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY', 'FUTURE_OPENING']:
            print(f"    [SKIP] Name: {name} status is {status}.")
            continue

        # Data Extraction
        address = place.get('formattedAddress', '')
        rating = place.get('rating', 0.0)
        tags = place.get('types', [])
        website = place.get('websiteUri', '')
        reviews = place.get('reviews', [])
        phone = place.get('nationalPhoneNumber', '')

        # The exact Maps UI Label
        maps_label = place.get('googleMapsTypeLabel', {}).get('text', '')
        if maps_label:
            tags.append(maps_label)

        delivery = place.get('delivery')
        if delivery:
            tags.append('delivery')

        # Extract EXACT City and State directly from Google's Address Components
        # This completely bypasses the need for PHP Regex
        city = ""
        state = ""
        for component in place.get('addressComponents', []):
            if 'locality' in component.get('types', []):
                city = component.get('shortText', '')
            if 'administrative_area_level_1' in component.get('types', []):
                state = component.get('shortText', '') # Gets "WA" instead of "Washington"

        # Grab the first photo if it exists
        photos = place.get('photos', [])
        photo_name = photos[0].get('name', '') if photos else ''
        image_url = build_photo_url(photo_name)

        # AI Generation
        description = generate_description(name, address, query, reviews)

        # --- Tag Normalization ---
        normalized_tags = []
        for tag in tags:
            clean_tag = tag.lower().replace(" ", "_").replace("-", "_")
            normalized_tags.append(clean_tag)
            
        # Remove any duplicates that resulted from normalization
        final_tags = list(set(normalized_tags))

        # Construct WordPress Payload
        wp_payload = {
            "title": name,
            "content": description,
            "status": "publish",
            "meta": {
                "street_address": address,
                "google_rating": rating,
                "listing_status": "Free",
                "google_place_id": place_id,
                "google_image_url": image_url,
                "website_url": website,
                "phone_number": phone,
                "google_city": city,
                "google_state": state,
                "google_tags": ",".join(final_tags) # Tags to single string - Interceptor to auto-categorize
            }
        }

        # print(f"\n--- wp_payload: {wp_payload} ---\n\n\n\n")

        # Push to WordPress
        push_to_wordpress(wp_payload)
        print("-" * 40)  

        # --- Throttle to prevent 429 Server Errors ---
        # print("    [Zzz] Sleeping for 3 seconds to appease the server firewall...")
        # time.sleep(3)
    
# --- The WordPress Pusher ---
def push_to_wordpress(payload):
    """POSTs the finalized JSON payload to the WP REST API."""
    print(f"[*] Pushing '{payload.get('title')}' to WordPress...")
    
    try:
        response = session.post(
            config.URL_LISTINGS,
            json=payload,
            auth=config.AUTH
        )
        
        if response.status_code == 201:
            print(f"    -> [SUCCESS] Listing published! View at: {response.json().get('link')}")
        else:
            print(f"    -> [!] WP Error {response.status_code}: {response.text}")
            
    except session.exceptions.RequestException as e:
        print(f"    -> [!] Error communicating with WordPress: {e}")
        # --- TRACE THE 429 HEADERS ---
        if e.response is not None:
            print("\n    [DEBUG] --- 429 Bouncer Identity ---")
            print(f"    Server Response Text: {e.response.text}")
            for key, value in e.response.headers.items():
                print(f"    {key}: {value}")
            print("    ------------------------------------\n")

if __name__ == "__main__":
    import random

    # Ask WordPress for the next target
    queue_url = config.URL_TARGET_CONED

    try:
        print("[*] Requesting next target from WordPress...")
        session = requests.Session()
        session.auth = config.AUTH
        
        target_res = session.get(queue_url)
        target_res.raise_for_status()
        target_data = target_res.json()
        
        if 'error' in target_data:
            print(f"[!] WordPress Error: {target_data['error']}")
            exit()
            
        query = target_data['query']
        print(f"\n=============================================")
        print(f"TARGET ACQUIRED: '{query}'")
        print(f"=============================================\n")
        
    except Exception as e:
        print(f"[!] Failed to contact WordPress: {e}")
        exit()

    # Execute the Search and Pagination Loop
    next_token = None
    page_num = 1
            
    while True:
        print(f"--- Fetching '{query}' Page: {page_num} ---")
        raw_places, next_token = fetch_google_places(query, page_token=next_token)
        
        if raw_places:
            # Pass them to your WordPress parsing function
            parse_for_wordpress(raw_places)
        
        # If Google gave us a token, there are more results
        if next_token:
            print("    [*] Next page found! Sleeping for 2 seconds before fetching...")
            time.sleep(2) # Google requires a brief pause before accepting a next_token
            page_num += 1
        else:
            print(f"[*] Finished all results for '{query}'.")
            break # Break the while loop, move to the next keyword
