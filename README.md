# ☁️ Nexoraa — Cloud-Based AI Disaster Response Web App

> **Live URL:** [https://nexoraa.onrender.com](https://nexora-webapp.onrender.com)

Nexoraa is a **cloud-hosted, AI-powered disaster response platform** that aggregates real-time distress signals, classifies them using Google Gemini AI, and visualizes emergencies on an interactive live map — accessible from **anywhere in the world**, on any device.

---

## 🌐 What Makes It Cloud-Based?

| Feature | Details |
|---|---|
| **Hosted on** | [Render](https://render.com) (Cloud PaaS) |
| **WSGI Server** | Gunicorn (production-grade) |
| **Always On** | Accessible 24/7 via public URL |
| **AI Backend** | Google Gemini 2.5 Flash API (cloud inference) |
| **Geocoding** | OpenStreetMap Nominatim API (external service) |
| **Mapping** | Google Maps JavaScript API (CDN-delivered) |
| **Python Version** | 3.11.0 |
| **No local setup needed** | Works entirely in the browser |

---

## 🌟 Key Features

- 🤖 **AI Classification** — Gemini 2.5 Flash categorizes distress feeds (medical, food, rescue, infrastructure)
- 🗺️ **Live Map Dashboard** — Real-time pin drops on Google Maps for each incoming emergency
- 🌍 **Multilingual NLP** — Handles Hindi, Gujarati, and other regional language inputs
- ⚡ **Real-time Feed Stream** — Background worker continuously generates and processes new distress signals
- 🔴 **Urgency Triage** — Auto-tags feeds as `high` (medical/rescue) or `medium`
- ✅ **Status Tracking** — Update each feed: `Pending → Dispatched → Resolved`
- 📝 **Manual Submission** — Anyone can submit a distress report via the web UI
- 📊 **Response Dashboard** — Dedicated command center view for coordinators

---

## ☁️ Cloud Architecture

```
Browser (Anywhere in the World)
        │
        ▼
  [Render Cloud Platform]
        │
  ┌─────────────────────────────┐
  │         Gunicorn            │  ← Production WSGI Server
  │         (app:app)           │
  └────────────┬────────────────┘
               │
        ┌──────▼──────┐
        │  Flask App  │  ← app.py
        │  + BG Thread│  ← background_scraper()
        └──────┬──────┘
               │
       ┌───────▼────────┐
       │  NLP Engine    │  ← nlp_engine.py
       └───┬────────┬───┘
           │        │
    ┌──────▼──┐  ┌──▼──────────┐
    │ Gemini  │  │  Nominatim  │
    │  API    │  │ (Geocoding) │
    └─────────┘  └─────────────┘

Maps rendered via Google Maps JavaScript API (CDN)
```

---

## 🚀 Deploy Your Own Instance

### Option 1: Deploy to Render (Recommended — Free Tier)

1. **Fork or clone** this repository to your GitHub account
2. Go to [render.com](https://render.com) → Sign up / Log in
3. Click **New → Web Service**
4. Connect your **GitHub repository**
5. Configure the service:

   | Setting | Value |
   |---|---|
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `gunicorn app:app` |
   | **Instance Type** | Free |

6. Add **Environment Variables** in the Render dashboard:

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `GOOGLE_MAPS_API_KEY` | Your Google Maps API key |
   | `SECRET_KEY` | Any random secret string |
   | `FLASK_ENV` | `production` |

7. Click **Deploy** — Your app goes live at `https://your-app-name.onrender.com` 🎉

---

### Option 2: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set env vars via the Railway dashboard.

---

### Option 3: Deploy to Heroku

```bash
heroku create nexoraa
heroku config:set GEMINI_API_KEY=your_key
heroku config:set GOOGLE_MAPS_API_KEY=your_key
heroku config:set FLASK_ENV=production
git push heroku main
```

---

## 🔑 Required API Keys

| Key | Where to Get | Free Tier |
|---|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | ✅ Yes |
| `GOOGLE_MAPS_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) | ✅ Yes (with billing enabled) |
| `SECRET_KEY` | Generate any random string | N/A |

---

## 🔌 REST API Reference

Base URL: `https://nexoraa.onrender.com`

### `GET /`
Returns the main landing page with the live map.

### `GET /dashboard`
Returns the response coordination dashboard.

### `GET /api/feeds`
Returns all active distress feeds as JSON.

**Response:**
```json
[
  {
    "id": 1696500000123,
    "text": "Need water in Tokyo immediately, people are thirsty.",
    "category": "food",
    "location_name": "Tokyo",
    "lat": 35.6762,
    "lng": 139.6503,
    "urgency": "medium",
    "status": "Pending",
    "timestamp": 1696500000000
  }
]
```

### `POST /api/submit`
Submit a new distress message.

**Request:**
```json
{ "text": "Medical emergency in Ahmedabad, someone is injured!" }
```

**Response:**
```json
{
  "message": "Successfully submitted and categorized.",
  "data": { "category": "medical", "location_name": "Ahmedabad", "urgency": "high", ... }
}
```

### `POST /api/update_status`
Update the status of an existing feed.

**Request:**
```json
{ "id": 1696500000123, "status": "Dispatched" }
```

---

## 🧠 AI & NLP Pipeline

```
Raw Text Input
      │
      ▼
[Google Gemini 2.5 Flash]
  → Translates (if regional language)
  → Extracts: category + location_name
      │
      ▼ (if Gemini unavailable)
[Keyword Fallback Engine]
  → Matches keywords → category
  → Regex extracts location phrase
      │
      ▼
[Geopy / Nominatim Geocoder]
  → Converts location name → lat/lng
      │
      ▼ (if geocoding fails)
[City Coordinate Dictionary]
  → 10 major cities hardcoded
      │
      ▼
Final Feed Object → Stored in memory → Served via API
```

**Supported Categories:**
| Category | Keywords |
|---|---|
| 🏥 medical | hospital, bleeding, ambulance, injured, hurt |
| 🍛 food | food, water, starving, hungry, thirsty, ration |
| 🆘 rescue | trapped, stuck, drowning, help, save, rescue |
| 🔧 infrastructure | road blocked, bridge, power, fire, rubble |

---

## 📁 Project Structure

```
nexoraa/
├── app.py               # Flask app, API routes, background thread
├── nlp_engine.py        # Gemini AI + geocoding NLP engine
├── templates/
│   ├── index.html       # Map view (landing page)
│   └── dashboard.html   # Command center dashboard
├── static/              # CSS, JS, static assets
├── requirements.txt     # Python dependencies
├── Procfile             # gunicorn start command for cloud deployment
├── runtime.txt          # python-3.11.0
└── .gitignore           # Excludes .env, venv, __pycache__
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web Framework | Flask 3.0.0 | HTTP routing, templating |
| WSGI Server | Gunicorn | Production server on Render |
| AI / NLP | Google Gemini 2.5 Flash | Text classification + extraction |
| Geocoding | Geopy + Nominatim | Location name → coordinates |
| Mapping | Google Maps JS API | Interactive map rendering |
| Env Config | python-dotenv | Secure API key management |
| Cloud Host | Render | Deployment platform |

---

## 🔒 Security Notes

- **Never commit your `.env` file** — it's listed in `.gitignore`
- Set all secrets via the **cloud platform's environment variable dashboard**
- `SECRET_KEY` should be a long, random string in production
- Set `FLASK_ENV=production` when deploying (disables debug mode)

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Built With

- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI text analysis
- [Geopy](https://geopy.readthedocs.io/) — Geocoding
- [Flask](https://flask.palletsprojects.com/) — Web framework
- [Render](https://render.com/) — Cloud hosting
- [Google Maps Platform](https://developers.google.com/maps) — Live mapping
