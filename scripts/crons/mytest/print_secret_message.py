import requests
from bs4 import BeautifulSoup

def print_secret_message(url):
    """
    Fetches coordinate and character data from a published Google Doc 
    and prints the resulting 2D grid to reveal a secret message.
    """
    # 1. Fetch the HTML content of the published Google Doc
    response = requests.get(url)
    response.raise_for_status()  # Ensure the request was successful
    
    # 2. Parse the HTML using BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 3. Find the table rows in the document
    rows = soup.find_all('tr')
    
    data = []
    max_x = 0
    max_y = 0
    
    # 4. Extract data, skipping the header row
    # Assuming columns are: x-coordinate, Character, y-coordinate
    for row in rows[1:]:
        cols = row.find_all('td')
        if len(cols) >= 3:
            try:
                # Extract text and parse coordinates
                x = int(cols[0].get_text(strip=True))
                
                # Retrieve character (handling spaces appropriately)
                char_text = cols[1].get_text()
                # If the cell is completely empty or just whitespace, treat it as a space
                char = char_text.strip() if char_text.strip() else ' '
                
                y = int(cols[2].get_text(strip=True))
                
                data.append((x, y, char))
                
                # Track the maximum x and y to determine grid size
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                
            except ValueError:
                # Skip rows that don't contain valid integer coordinates
                continue
                
    # 5. Initialize the grid with empty spaces
    # y represents the rows (height), x represents the columns (width)
    grid = [[' ' for _ in range(max_x + 1)] for _ in range(max_y + 1)]
    
    # 6. Populate the grid with the characters at their specific coordinates
    for x, y, char in data:
        grid[y][x] = char
        
    # 7. Print the final grid row by row
    for row in grid:
        print(''.join(row))

# --- Example Usage ---
# url = "https://docs.google.com/document/d/e/2PACX-1vQ.../pub"
# print_secret_message(url)