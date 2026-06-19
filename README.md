# GCP Developer Release Hub & Social Post Composer

A modern, visually stunning web application built to track, filter, and share Google Cloud Platform release updates to social platforms (X/Twitter and LinkedIn) instantly. 

This application is tailored for **Machine Learning & Computer Vision** students and developers, defaulting to track **Vertex AI** release notes, with support to toggle to **BigQuery** analytics updates.

---

## ✨ Features

- **Multi-Feed RSS Aggregator:** Toggles dynamically between Vertex AI (AI/ML platform) and BigQuery (Analytics warehouse) release notes feeds.
- **Dynamic UI Re-Branding:** Swapping feeds dynamically adapts the UI headers, logo icons (Brain vs. Database), and background styling gradients.
- **Granular Update Category Splitting:** Splits multi-category daily entries into separate actionable items (*Feature*, *Changed*, *Deprecated*, *Fixed*, etc.).
- **Theme Toggling (Dark/Light Mode):** A toggle switch in the header overrides CSS variables to swap color schemes, persisting your choice in `localStorage`.
- **Export to CSV:** Downloads the currently filtered and searched release notes as a formatted CSV file (`Date, Type, Description, Link`).
- **Social Composer with Live Validation:**
  - **🐦 X / Twitter Tab:** Micro-blogging layout with a strict 280-character limit, interactive circular progress meter, and direct posting via Web Intents.
  - **💼 LinkedIn Tab:** Professional post layout containing the complete description, 3,000-character limit, automatic clipboard copy, and direct feed redirects.
  - **Feed-Aware Formatting:** Auto-generates related hashtags based on the product (e.g. `#VertexAI #MachineLearning #ComputerVision` for Vertex AI).
- **Premium Glassmorphic UI:** Sleek modern design featuring responsive grids, modal overlay actions, and micro-interaction notifications.

---

## 🛠️ Technology Stack

- **Backend:** Python 3.10+, Flask, Requests, BeautifulSoup4
- **Frontend:** Plain HTML5, Vanilla CSS3, Vanilla ES6 JavaScript
- **Icons:** FontAwesome v6 (CDN)
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
├── app.py                # Flask application backend (caching, parsing endpoints)
├── requirements.txt      # Python dependencies
├── .gitignore            # Git exclusion rules
├── README.md             # Project documentation
│
├── templates/
│   └── index.html        # App interface (selectors, modals, theme toggles)
│
└── static/
    ├── style.css         # Glassmorphic custom styles and light theme overrides
    └── app.js            # Client-side AJAX, search, filtering, and social sharing logic
```

---

## 📜 License
This project is open-source and available under the MIT License. Data is synced with official Google Cloud Platform documentation.
