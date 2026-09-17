# **Automated B2B Coffee Outreach Architecture**

## **Executive Summary**

This document outlines the architecture for an automated B2B outbound engine designed to drive high-volume, recurring coffee pod sales through an existing Shopify \+ Roastify fulfillment stack.

**Core Objective:** Build an automated machine that finds commercial coffee buyers and drives them directly to your existing Shopify product/subscription checkout.

**Key Mechanics:**

1. **Target Shift:** Move from individual consumers to mid-sized professional offices (law firms, accounting practices, agencies).  
2. **Product Pivot (K-Cups):** Capitalize on the fact that \>75% of breakrooms use single-serve pod machines, eliminating hardware friction.  
3. **Unit Economic Restructuring:** Bundle 10-packs into monthly operational case sizes (40, 80, 120 pods) to drastically reduce transaction and shipping overhead, increasing net margin from \~$2.30 to over $20.00+ per drop.  
4. **Zero-Cost Lead Gen:** Utilize free, unauthenticated APIs (Overpass) and direct DOM scraping to identify office managers without paying for lead databases.  
5. **Frictionless Conversion:** Route cold outreach directly to pre-populated Shopify carts with subscription discounts applied.

## **Technical Architecture (Pseudo-Code)**

### **External Configuration**

All environment variables, API endpoints, store URLs, and Shopify Product IDs are abstracted into a single configuration file (config.json or .env).

// ==========================================  
// ENVIRONMENT CONFIGURATION 
// ==========================================  
IMPORT Config FROM "external_config.json"

Expected shape of external_config.json:  
{  
"OVERPASS_API_URL": "https://overpass-api.de/api/interpreter",  
"SMTP_SENDER_EMAIL": "verify@lagginglogic.com",  
"STORE_CART_URL": "https://lagginglogic.com/cart/",  
"POD_VARIANT_ID": "YOUR_SHOPIFY_VARIANT_ID",  
"SEAL_PLAN_ID": "YOUR_SEAL_SUBSCRIPTION_PLAN_ID",  
"B2B_DISCOUNT_CODE": "OFFICE15"  
}  
\*/

### **Phase 1: Zero-Cost Target Scraping & Lead Enrichment**

This phase uses the OpenStreetMap Overpass API to find local businesses, scrapes their websites for team directories, and algorithmically deduces and verifies the office manager's email.

IMPORT HTTP_Client, Regex, DNS_Resolver, Socket

// \==========================================  
// STAGE 1: Extract Local Office Domains  
// \==========================================  
FUNCTION Fetch_Target_Offices(city_name="Tacoma", state="WA"):  
// Query Overpass API for professional office categories  
overpass_query \= """  
\[out:json\]\[timeout:30\];  
area\["name"="""" \+ city_name \+ """"\]-\>.searchArea;  
(  
node\["office"\~"lawyer|accountant|architect|it|company"\](area.searchArea);  
way\["office"\~"lawyer|accountant|architect|it|company"\](area.searchArea);  
);  
out body;  
\>;  
out skel qt;  
"""  
  
// Using centralized config for API endpoint  
response \= HTTP_Client.POST(Config.OVERPASS_API_URL, body=overpass_query)  
raw_nodes \= response.json.elements  
  
office_targets \= \[\]  
FOR EACH node IN raw_nodes:  
IF node.tags.website IS NOT NULL:  
office_targets.APPEND({  
"company_name": node.tags.name OR "Local Business",  
"website": Normalize_URL(node.tags.website)  
})  
  
RETURN office_targets

// \==========================================  
// STAGE 2: Deep-Crawl Domain for Buyer Role  
// \==========================================  
FUNCTION Scrape_Office_Decision_Maker(domain_url):  
target_paths \= \["/about", "/our-team", "/team", "/staff", "/contact"\]  
target_titles \= \["office manager", "operations manager", "firm administrator", "executive assistant"\]  
  
html_corpus \= Fetch_HTML_From_Paths(domain_url, target_paths)

// 1\. Check for generic role-based emails (office@, admin@)  
generic_match \= Find_Generic_Role_Emails(html_corpus)  
IF generic_match: RETURN generic_match

// 2\. Parse text for names associated with target titles  
FOR EACH title IN target_titles:  
pattern \= r'(\[A-Z\]\[a-z\]+ \[A-Z\]\[a-z\]+)\[\\s,–—\\-\]+' \+ Regex.Escape(title)  
match \= Regex.Search(pattern, html_corpus, IGNORE_CASE)  
  
IF match FOUND:  
first_name, last_name \= Split_Name(match.group(1))  
domain_name \= Extract_Root_Domain(domain_url)  
  
// Reconstruct and test email permutations  
candidate_emails \= Generate_Email_Permutations(first_name, last_name, domain_name)  
  
FOR EACH candidate IN candidate_emails:  
IF Zero_Cost_SMTP_Ping(candidate, domain_name):  
RETURN {"name": first_name, "email": candidate}  
  
RETURN NULL

// \==========================================  
// STAGE 3: Zero-Cost Email Verification  
// \==========================================  
FUNCTION Zero_Cost_SMTP_Ping(email, domain):  
mx_records \= DNS_Resolver.Query(domain, "MX")  
IF mx_records IS EMPTY: RETURN FALSE  
  
primary_mx \= mx_records.SORT_BY_PRIORITY()\[0\].host  
  
TRY:  
socket \= Socket.Connect(primary_mx, 25, timeout=5)  
socket.Receive()  
socket.Send("HELO localhost\\r\\n")  
socket.Receive()  
  
// Using centralized config for sender email  
socket.Send("MAIL FROM:\<" \+ Config.SMTP_SENDER_EMAIL \+ "\>\\r\\n")  
socket.Receive()  
socket.Send("RCPT TO:\<" \+ email \+ "\>\\r\\n")  
response \= socket.Receive()  
socket.Close()  
  
RETURN response.STARTS_WITH("250")  
CATCH Exception:  
RETURN FALSE

### **Phase 2: Dynamic B2B Bundling & Pitch Generation**

This phase defines the monthly operational bundles to maximize margin and generates the pre-populated Shopify checkout link based on your store's configuration.

// \==========================================  
// STAGE 4: Define Office Bundles  
// \==========================================  
TIER_1_MICRO \= { "name": "Starter (40 Pods)", "boxes": 4, "price": 62.92 }  
TIER_2_STANDARD \= { "name": "Team (80 Pods)", "boxes": 8, "price": 125.84 }  
TIER_3_COMMERCIAL \= { "name": "High-Traffic (120 Pods)", "boxes": 12, "price": 188.76 }

FUNCTION Assign_Office_Bundle(staff_count):  
IF staff_count \<= 5: RETURN TIER_1_MICRO  
IF staff_count \<= 15: RETURN TIER_2_STANDARD  
RETURN TIER_3_COMMERCIAL

// \==========================================  
// STAGE 5: Generate Outreach Payload  
// \==========================================  
FUNCTION Generate_Targeted_Outbound_Payload(lead, staff_count=10):  
selected_tier \= Assign_Office_Bundle(staff_count)  
  
// Construct pre-filled Shopify cart permalink using centralized Config  
checkout_url \= Config.STORE_CART_URL \+  
Config.POD_VARIANT_ID \+ ":" \+ selected_tier.boxes \+  
"?selling_plan=" \+ Config.SEAL_PLAN_ID \+  
"\&discount=" \+ Config.B2B_DISCOUNT_CODE

RETURN {  
"email": lead.email,  
"name": lead.name,  
"company": lead.company_name,  
"pod_count": selected_tier.boxes \* 10,  
"monthly_total": selected_tier.price,  
"url": checkout_url  
}

// \==========================================  
// STAGE 6: Execute Cold Pitch  
// \==========================================  
FUNCTION Execute_B2B_Outreach(payload):  
email_body \= """  
Hey {payload.name},

Who handles keeping the Keurig stocked for the {payload.company} team?

Most breakrooms run out of pods mid-month because nobody wants to do Costco runs or deal with weekly grocery orders.

We roast on-demand and deliver freshly packed single-serve pods directly to your office on a set monthly schedule. For a team your size, our standard breakroom case is {payload.pod_count} pods once a month for ${payload.monthly_total} flat—no shipping fees.

You can lock in the monthly replenishment directly here:  
{payload.url}

Compatible with all standard Keurigs. You can pause or adjust count anytime via your portal.  
"""  
  
Send_Email(to=payload.email, subject="Restocking the \[Company\] Keurig (Dark Mode roast)", body=email_body)

### **Phase 3: Order Fulfillment (Existing Pipes)**

Because the Shopify store and Roastify app are already integrated, no new code is required for fulfillment. The process runs passively on the backend.

// \==========================================  
// STAGE 7: Fulfillment Webhook (Passive)  
// \==========================================  
EVENT On_Shopify_Order_Created(order_payload):  
// 1\. Customer checks out via the pre-filled URL.  
// 2\. Seal Subscriptions logs the recurring mandate.  
// 3\. Shopify native webhook fires to the Roastify app.  
// 4\. Roastify processes the multi-box consolidated carton.  
// 5\. Roastify ships and returns tracking to Shopify.  
  
IF order_payload.contains_tag("B2B_PROSPECT"):  
Update_CRM_Status(order_payload.customer_email, "ACTIVE_SUBSCRIPTION")  
