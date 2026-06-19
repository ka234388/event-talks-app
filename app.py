import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for feed data
_cache = {
    "data": None,
    "last_updated": None
}

def clean_html_content(content):
    """
    Cleans up HTML inside release notes content, formatting lists and stripping extra tags.
    """
    if not content:
        return ""
    soup = BeautifulSoup(content, 'html.parser')
    
    # Make links open in a new tab and style them nicely
    for link in soup.find_all('a'):
        link['target'] = '_blank'
        link['rel'] = 'noopener noreferrer'
        link['class'] = 'note-link'
        
    return str(soup)

def parse_feed():
    """
    Fetches and parses the Atom XML feed from GCP.
    Splits each day's entry into separate items based on <h3> tags.
    """
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching RSS feed: {e}")
        return []

    try:
        # Atom feed namespace
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(response.content)
        
        parsed_items = []
        
        for entry in root.findall("atom:entry", ns):
            date_str = entry.find("atom:title", ns).text.strip()
            entry_id = entry.find("atom:id", ns).text.strip()
            updated_str = entry.find("atom:updated", ns).text.strip()
            
            link_node = entry.find("atom:link[@rel='alternate']", ns)
            if link_node is None:
                link_node = entry.find("atom:link", ns)
            
            entry_link = link_node.attrib.get("href") if link_node is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_node = entry.find("atom:content", ns)
            if content_node is None or content_node.text is None:
                continue
                
            content_html = content_node.text.strip()
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Split by <h3> elements to separate different update types (Feature, Changed, Deprecated, Fixed, etc.)
            current_type = "Update"
            current_elements = []
            
            # Helper to create an item
            def create_item(type_name, html_elements):
                if not html_elements:
                    return None
                
                # Render HTML block
                html_str = clean_html_content("".join(str(el) for el in html_elements))
                
                # Render raw text for copying or tweeting (without markdown/html tags)
                text_soup = BeautifulSoup(html_str, 'html.parser')
                text_str = text_soup.get_text(separator=' ').strip()
                # Replace multiple spaces/newlines
                text_str = " ".join(text_str.split())
                
                # Generate unique ID based on entry ID and type
                item_id = f"{entry_id}_{type_name.lower()}".replace("#", "_").replace(":", "_").replace(",", "_").replace(" ", "_")
                
                return {
                    "id": item_id,
                    "date": date_str,
                    "timestamp": updated_str,
                    "type": type_name,
                    "html": html_str,
                    "text": text_str,
                    "link": entry_link
                }
            
            for child in soup.contents:
                # If we encounter a tag element
                if child.name == 'h3':
                    # Save current group if we have one
                    item = create_item(current_type, current_elements)
                    if item:
                        parsed_items.append(item)
                    
                    # Start new group
                    current_type = child.get_text().strip()
                    current_elements = []
                elif child.name:
                    current_elements.append(child)
            
            # Save the final group in this entry
            item = create_item(current_type, current_elements)
            if item:
                parsed_items.append(item)
                
        return parsed_items
        
    except Exception as e:
        print(f"Error parsing RSS XML: {e}")
        import traceback
        traceback.print_exc()
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Serve from cache if available and not forcing refresh
    if not force_refresh and _cache["data"] is not None:
        return jsonify({
            "source": "cache",
            "items": _cache["data"]
        })
        
    # Fetch and parse
    items = parse_feed()
    if items:
        _cache["data"] = items
        
    return jsonify({
        "source": "live",
        "items": items or _cache["data"] or []
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
