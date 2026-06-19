# GCP Developer Release Hub & AI Research Lab

A premium, visually stunning web application built to track, filter, and share Google Cloud Platform release updates, alongside an **AI Research Lab** for advanced Q&A and document comparison.

This application is tailored for **Machine Learning & Computer Vision** students and developers. It defaults to tracking **Vertex AI** release notes (with dynamic re-branding for **BigQuery** analytics updates) and includes an interactive playground for extracting insights from local files, websites, and policy documents.

---

## 🛠️ Technology Stack

- **Backend:** Python 3.10+, Flask, Requests, BeautifulSoup4, PyPDF
- **Frontend:** HTML5, Vanilla CSS3 (Glassmorphic dark/light design system), Vanilla ES6 JavaScript
- **Icons & Fonts:** FontAwesome v6 (CDN), Outfit, Inter, JetBrains Mono (Google Fonts)

---

## 🚀 Getting Started & Installation

### 1. Prerequisites
Make sure you have Python 3.8+ installed on your system.

### 2. Navigate and Install Dependencies
Open your command terminal, navigate to the directory where the files are located, and install the required packages:
```bash
pip install -r requirements.txt
```

### 3. Start the Flask Server
Run the Flask server locally:
```bash
python app.py
```

### 4. Launch the Web Application
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🌟 Core Features Guide

### 1. GCP Release Notes Feed
* **Dynamic Feed Aggregator:** Toggle between **Vertex AI** (Machine Learning/Computer Vision) and **BigQuery** (Data Analytics) feeds using the dropdown. Swapping feeds triggers a dynamic UI re-branding, altering header colors, subtitles, and logo icons (Brain vs. Database).
* **Live Keyword Search:** Type search words (e.g., `embeddings`, `vector`, `partitioning`) to instantly filter release cards.
* **Category Filters:** Filter notes by update types (*Features*, *Changes*, *Deprecations*, *Fixes*, etc.).
* **Export to CSV:** Click **Export CSV** in the header to download the currently filtered list as a structured spreadsheet.
* **Theme Switcher:** Click the toggle switch in the header to swap between **Glassmorphic Dark Mode** and **Sleek Light Mode**. Your preference is saved in `localStorage`.

### 2. Social Composer Modal
* Select any release notes card and click **Share / Post** to open the composer modal.
* **🐦 X / Twitter Tab:** Formats a concise post under a strict 280-character limit with a circular visual progress ring. Publishes via Twitter Web Intents.
* **💼 LinkedIn Tab:** Formats a professional summary, includes official release documentation links, and appends ML/AI hashtags. Copies the draft and opens LinkedIn in a new tab.

---

## 🧪 AI Research Lab: Step-by-Step Scenario Guides

To access the Research Lab, click the **AI Research Lab** tab in the main header navigation.

```
+-------------------------------------------------------------+
|                     AI RESEARCH LAB                         |
+-------------------------------------------------------------+
| [1. Document Q&A]    | [2. Web Page Q&A]   | [3. Compare]   |
+-------------------------------------------------------------+
```

---

### Scenario A: Q&A on a Local Document (PDF / TXT / MD)
Use this tab to extract answers from manuals, research papers, or local texts.

* **Example Use Case:** Troubleshooting a network manual.
* **Step-by-Step Instructions:**
  1. Click the **Document Q&A** sub-tab.
  2. Drag and drop your document (e.g., `user_manual.pdf`) into the dashed upload zone (or click to browse).
  3. When attached, the uploader will display your file name: `📄 user_manual.pdf`.
  4. In the question area, type your query:
     > *"What are the steps to troubleshoot network connectivity issues?"*
  5. Click **Ask AI Assistant**. The emulated terminal console will output each parser step and display the synthesized report below.

---

### Scenario B: Q&A on a Web Page (Scraper)
Use this tab to pull content directly from web links and extract key facts.

* **Example Use Case:** Extracting climate health risks from the WHO detail page.
* **Step-by-Step Instructions:**
  1. Click the **Web Page Q&A** sub-tab.
  2. In the URL input field, enter the target address:
     `https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health`
  3. In the question area, type:
     > *"What are the primary health risks associated with climate change according to WHO?"*
  4. Click **Analyze Webpage**. The backend scraper will download the text, check for matches, and generate the summary card.

---

### Scenario C: Compare Information Across Sources (Dual Uploader)
Use this tab to upload two separate articles and create a comparative impact analysis.

* **Example Use Case:** Comparing small business perspectives on new tax policy updates.
* **Step-by-Step Instructions:**
  1. Click the **Compare Sources** sub-tab.
  2. In **Source Document A**, upload your first file: `article1.txt`.
  3. In **Source Document B**, upload your second file: `article2.txt`.
  4. In the comparison prompt, type:
     > *"Compare and contrast their views on the potential impact on small businesses."*
  5. Click **Compare Documents** to run the local comparison matrix.

---

## 🔑 Gemini API Key vs. Local Keyword Search

The AI Research Lab operates in two distinct modes depending on whether you provide a Gemini API Key. You can save/delete this key in the settings panel at the top of the Research Lab page.

### 1. Fallback Local Keyword Search (No API Key Required)
If you do not input an API key, the application automatically runs a private offline search engine to protect your data:
* **How it works:**
  1. The server splits your document or web page into paragraphs.
  2. It strips common english stop words (e.g., `the`, `and`, `are`) from your question to isolate core keywords.
  3. It ranks paragraphs based on term frequency overlap.
  4. It displays the top scoring source passages directly inside quotes so you can inspect verified extracts.
* **Advantage:** Runs offline, completely private, zero cost, and has zero network dependency.
* **Disadvantage:** Cannot rephrase, summarize, or synthesize answers; it only extracts matching paragraphs verbatim.

### 2. Upgraded Gemini Generative AI Search (API Key Required)
When you input a standard Google AI Gemini API Key (starts with `AIzaSy...`), the Research Lab unlocks full Generative AI features:
* **How it works:**
  1. The app parses your document text or scrapes the target website.
  2. It packages your question along with the source text into a structured prompt context.
  3. It calls the official **Gemini 1.5 Flash** model.
  4. The model reasons over the documents and synthesizes a structured report in Markdown.
* **Advantage:** Provides complete synthesized answers, rephrases difficult concepts, creates tables/comparisons, and extracts insights beyond exact keywords.
* **Security:** Your API key is stored securely in your browser's local session (`localStorage`) and is only sent to your own local Flask server to execute the API call. It is never stored on external databases.

---

## 📂 Project Directory Structure

```
event-talks-app/
│
├── app.py                # Flask Backend (caching, scrapers, and Gemini API bindings)
├── requirements.txt      # Python libraries (flask, bs4, requests, pypdf, google-generativeai)
├── README.md             # Detailed user guide and setup documentation
├── .gitignore            # Git exclusion rules
│
├── templates/
│   └── index.html        # HTML layout (selectors, composer modals, and terminal console)
│
└── static/
    ├── style.css         # Glassmorphic CSS variables, animations, and Light/Dark overrides
    └── app.js            # Client-side AJAX, uploader events, and Social Composer logic
```
