# BigQuery Release Notes Hub & Social Post Composer

A modern, visually stunning web application built to track, filter, and share Google Cloud BigQuery release updates to social platforms (X/Twitter and LinkedIn) instantly.

The application fetches the official GCP Atom feed, programmatically splits aggregated daily releases into individual categories, and features a rich social post composer with validation and live character limits.

---

## ✨ Features

- **Automated RSS Fetching & Caching:** Connects to the GCP BigQuery release notes Atom feed with an in-memory server cache to minimize network overhead.
- **Granular Update Category Splitting:** Splits multi-category daily entries into separate actionable items (*Feature*, *Changed*, *Deprecated*, *Fixed*, etc.).
- **Full-Text Filter & Search:** Real-time client-side filtering by categories and keyword searches.
- **Social Composer with Live Validation:**
  - **X / Twitter Tab:** Micro-blogging layout with a strict 280-character limit, interactive circular progress meter, and direct posting via Web Intents.
  - **LinkedIn Tab:** Professional post layout containing the complete description, 3,000-character limit, automatic clipboard copy, and direct feed redirects.
- **Premium Glassmorphic UI:** Sleek modern styling with dark-mode color palettes, fluid hover states, and smooth modal animations.

---

## 🛠️ Technology Stack

- **Backend:** Python 3.10+, Flask, Requests, BeautifulSoup4
- **Frontend:** Plain HTML5, Vanilla CSS3 (custom variables, responsive layout, glassmorphism), Vanilla ES6 JavaScript (event-driven state management)
- **Icons:** FontAwesome v6 (loaded via CDN)
- **Fonts:** Outfit, Inter, JetBrains Mono (Google Fonts)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3.7+ installed.

### 1. Clone & Navigate
Navigate to your project directory:
```bash
cd event-talks-app
```

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 4. Open the Web Application
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 📂 Project Structure

```
event-talks-app/
│
├── app.py                # Flask application backend (feed fetcher, parser)
├── requirements.txt      # Python dependencies
├── .gitignore            # Git exclusion rules
├── README.md             # Project documentation
│
├── templates/
│   └── index.html        # App interface (semantic layout, modals, tabs)
│
└── static/
    ├── style.css         # Glassmorphic custom CSS styling
    └── app.js            # Client-side AJAX, search, filtering, and social sharing logic
```

---

## 📜 License
This project is open-source and available under the MIT License. Data is synced with official Google Cloud Platform documentation.
