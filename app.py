import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URLs
FEEDS = {
    "vertex-ai": "https://docs.cloud.google.com/feeds/vertex-ai-release-notes.xml",
    "bigquery": "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
}

# In-memory caches for each feed data
_cache = {
    "vertex-ai": {"data": None, "last_updated": None},
    "bigquery": {"data": None, "last_updated": None}
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

def parse_feed(feed_url):
    """
    Fetches and parses the Atom XML feed from GCP.
    Splits each day's entry into separate items based on <h3> tags.
    """
    try:
        response = requests.get(feed_url, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching RSS feed from {feed_url}: {e}")
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
            
            entry_link = link_node.attrib.get("href") if link_node is not None else "https://cloud.google.com/vertex-ai/docs/release-notes"
            
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

import io
import re
import pypdf
import google.generativeai as genai

def extract_text_from_file(file):
    """
    Extracts plain text from an uploaded file object (.txt, .md, .pdf).
    """
    filename = file.filename.lower()
    file_bytes = file.read()
    
    if filename.endswith('.pdf'):
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = pypdf.PdfReader(pdf_file)
            text_list = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_list.append(page_text)
            return "\n".join(text_list)
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    else:
        # Assume plain text (UTF-8 or similar)
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"Error reading text file: {e}")
            return ""

def split_into_paragraphs(text):
    """
    Splits text into meaningful paragraphs.
    """
    if not text:
        return []
    # Split by double newlines or single newlines that look like separate paragraphs
    paragraphs = re.split(r'\n\s*\n', text)
    cleaned = []
    for p in paragraphs:
        p_clean = p.strip()
        if len(p_clean) > 4: # ignore empty or single-character lines
            cleaned.append(p_clean)
    return cleaned

def local_keyword_search(query, text, limit=4):
    """
    Finds and ranks paragraphs in text that match keywords in the query.
    """
    paragraphs = split_into_paragraphs(text)
    if not paragraphs or not query:
        return []
        
    # Extract query words (lowercase, alphanumeric, len > 2)
    words = re.findall(r'\b\w{3,}\b', query.lower())
    # Simple stop words list to focus on content words
    stopwords = {'the', 'and', 'for', 'with', 'what', 'are', 'steps', 'this', 'how', 'about', 'from', 'that', 'your', 'have'}
    keywords = [w for w in words if w not in stopwords]
    
    if not keywords:
        keywords = words if words else [query.lower()]
        
    scored_paragraphs = []
    for p in paragraphs:
        p_lower = p.lower()
        score = 0
        matches = 0
        for kw in keywords:
            occurrences = len(re.findall(r'\b' + re.escape(kw) + r'\b', p_lower))
            if occurrences > 0:
                score += occurrences * 5 + 10 # frequency weight + hit bonus
                matches += 1
        
        if matches > 0:
            score *= (matches / len(keywords)) + 0.5
            scored_paragraphs.append((score, p))
            
    scored_paragraphs.sort(key=lambda x: x[0], reverse=True)
    return [p[1] for p in scored_paragraphs[:limit] if p[0] > 0]

def call_gemini_api(api_key, context, question):
    """
    Calls the official Gemini model API using the user's key.
    """
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""You are an expert AI Research Assistant. Your task is to provide a detailed, verified answer to the user's question, using ONLY the context provided below.
Use Markdown formatting (bullet points, bold headings, code snippets) to present the synthesized answer beautifully.
If the answer cannot be found in the context, explicitly say: "I could not find the answer in the provided documents."

CONTEXT:
---
{context}
---

QUESTION: {question}

Please synthesize a detailed and helpful response. Be precise and ground everything in the provided context.
"""
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"⚠️ **Error calling Gemini API:** {str(e)}\n\n*Please ensure your API Key is valid and has permissions.*"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    feed_type = request.args.get('feed', 'vertex-ai')
    if feed_type not in FEEDS:
        feed_type = 'vertex-ai'
        
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    feed_cache = _cache[feed_type]
    
    # Serve from cache if available and not forcing refresh
    if not force_refresh and feed_cache["data"] is not None:
        return jsonify({
            "source": "cache",
            "items": feed_cache["data"]
        })
        
    # Fetch and parse
    items = parse_feed(FEEDS[feed_type])
    if items:
        feed_cache["data"] = items
        
    return jsonify({
        "source": "live",
        "items": items or feed_cache["data"] or []
    })

@app.route('/api/document-qa', methods=['POST'])
def document_qa():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    question = request.form.get('question', '').strip()
    api_key = request.form.get('apiKey', '').strip()
    
    if not question:
        return jsonify({"error": "No question provided"}), 400
        
    text = extract_text_from_file(file)
    if not text:
        return jsonify({"error": "Could not extract text from document"}), 400
        
    passages = local_keyword_search(question, text, limit=4)
    
    if api_key:
        truncated_text = text[:100000] # Limit context size
        synthesis = call_gemini_api(api_key, truncated_text, question)
        mode = "llm"
    else:
        mode = "local"
        if passages:
            synthesis = f"🤖 **Local Smart Search Result** (No API Key provided):\n\nI found the following highly relevant passages inside the document that address your query:\n\n"
            for i, passage in enumerate(passages, 1):
                synthesis += f"**Section {i}:**\n> {passage}\n\n"
            synthesis += "\n*💡 Tip: Enter a valid Gemini API Key in the settings panel above to generate a fully synthesized response.*"
        else:
            synthesis = "❌ **Local Smart Search Result**:\n\nI scanned the document but could not find any paragraphs containing matching keywords for your question. Try using different keywords, or configure a Gemini API key."
            
    return jsonify({
        "mode": mode,
        "synthesis": synthesis,
        "passages": passages
    })

@app.route('/api/web-qa', methods=['POST'])
def web_qa():
    data = request.json or {}
    url = data.get('url', '').strip()
    question = data.get('question', '').strip()
    api_key = data.get('apiKey', '').strip()
    
    if not url or not question:
        return jsonify({"error": "Missing URL or question"}), 400
        
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status()
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve web page: {str(e)}"}), 400
        
    soup = BeautifulSoup(r.content, 'html.parser')
    body_elements = soup.find_all(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    text = "\n\n".join(el.get_text().strip() for el in body_elements if el.get_text().strip())
    
    if not text:
        return jsonify({"error": "No readable text found on webpage"}), 400
        
    passages = local_keyword_search(question, text, limit=4)
    
    if api_key:
        synthesis = call_gemini_api(api_key, text[:100000], question)
        mode = "llm"
    else:
        mode = "local"
        if passages:
            synthesis = f"🤖 **Local Web Scraper Result** (No API Key provided):\n\nI scraped the page and extracted the following paragraphs related to your query:\n\n"
            for i, passage in enumerate(passages, 1):
                synthesis += f"**Source Paragraph {i}:**\n> {passage}\n\n"
            synthesis += "\n*💡 Tip: Add your Gemini API Key in the config section above to synthesize a complete report.*"
        else:
            synthesis = "❌ **Local Web Scraper Result**:\n\nScraped the URL successfully, but found no matching context for your question. Try re-wording your query."
            
    return jsonify({
        "mode": mode,
        "synthesis": synthesis,
        "passages": passages
    })

@app.route('/api/compare-sources', methods=['POST'])
def compare_sources():
    if 'file1' not in request.files or 'file2' not in request.files:
        return jsonify({"error": "Two files are required for comparison"}), 400
    file1 = request.files['file1']
    file2 = request.files['file2']
    question = request.form.get('question', '').strip()
    api_key = request.form.get('apiKey', '').strip()
    
    if not question:
        question = "Compare and contrast the views of these two documents."
        
    text1 = extract_text_from_file(file1)
    text2 = extract_text_from_file(file2)
    
    if not text1 or not text2:
        return jsonify({"error": "Could not extract text from one or both files"}), 400
        
    passages_a = local_keyword_search(question, text1, limit=2)
    passages_b = local_keyword_search(question, text2, limit=2)
    
    if api_key:
        combined_context = f"DOCUMENT A ({file1.filename}):\n---\n{text1[:50000]}\n---\n\nDOCUMENT B ({file2.filename}):\n---\n{text2[:50000]}\n---\n"
        synthesis = call_gemini_api(api_key, combined_context, question)
        mode = "llm"
    else:
        mode = "local"
        synthesis = f"🤖 **Local Source Comparison** (No API Key provided):\n\n"
        synthesis += f"**Key Excerpts from Document A ({file1.filename}):**\n"
        for i, p in enumerate(passages_a, 1):
            synthesis += f"> A{i}: {p}\n\n"
        synthesis += f"\n**Key Excerpts from Document B ({file2.filename}):**\n"
        for i, p in enumerate(passages_b, 1):
            synthesis += f"> B{i}: {p}\n\n"
        synthesis += "\n*💡 Tip: Use a Gemini API Key to run a comprehensive LLM comparison and generate a contrast matrix.*"
        
    merged_passages = [f"Source A: {p}" for p in passages_a] + [f"Source B: {p}" for p in passages_b]
    
    return jsonify({
        "mode": mode,
        "synthesis": synthesis,
        "passages": merged_passages
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
