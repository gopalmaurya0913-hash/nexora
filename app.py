from flask import Flask, jsonify, render_template, request
import time
import random
import threading
import os
from dotenv import load_dotenv
from nlp_engine import analyze_text

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# Global list to store processed feeds
feed_data = []

# Mock some social media / SMS feeds coming in globally
MOCK_FEEDS = [
    "Need water in Tokyo immediately, people are thirsty.",
    "Road blocked near New York, send help to clear the rubble.",
    "Medical emergency in London, someone is bleeding.",
    "Trapped on the roof in Sydney, please rescue us!",
    "Power is down in Mumbai district, we need electricity.",
    "Ambulance needed in Cape Town, severe injuries.",
    "Starving here at Sao Paulo, any food drops coming?",
    "Huge earthquake hit Cairo, buildings collapsed, need rescue.",
    "Istanbul bridge is blocked by an accident.",
    "Fire spreading in Beijing, send the trucks."
]

def background_scraper():
    """Simulates a background worker scraping streams and parsing them."""
    global feed_data
    # First, populate a few immediately so the map isn't empty on load
    for i in range(3):
        text = random.choice(MOCK_FEEDS)
        processed = analyze_text(text)
        processed["timestamp"] = int(time.time() * 1000)
        processed["id"] = int(time.time() * 1000) + random.randint(1, 1000)
        processed["status"] = "Pending"
        feed_data.append(processed)
        
    while True:
        time.sleep(random.randint(5, 12))  # New feed every 5-12 seconds
        text = random.choice(MOCK_FEEDS)
        processed = analyze_text(text)
        processed["timestamp"] = int(time.time() * 1000)
        processed["id"] = int(time.time() * 1000) + random.randint(1, 1000)
        processed["status"] = "Pending"
        
        # Keep only the latest 100
        feed_data.append(processed)
        if len(feed_data) > 100:
            feed_data.pop(0)

@app.route("/")
def index():
    google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    return render_template("index.html", google_maps_key=google_maps_key)

@app.route("/dashboard")
def dashboard():
    google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    return render_template("dashboard.html", google_maps_key=google_maps_key)

@app.route("/api/feeds", methods=["GET"])
def get_feeds():
    # Return the latest feeds
    return jsonify(feed_data)

@app.route("/api/update_status", methods=["POST"])
def update_status():
    data = request.get_json()
    feed_id = data.get("id")
    new_status = data.get("status")
    
    for item in feed_data:
        if item.get("id") == feed_id:
            item["status"] = new_status
            return jsonify({"message": "Status updated successfully", "data": item})
    
    return jsonify({"error": "Feed not found"}), 404

@app.route("/api/submit", methods=["POST"])
def submit_feed():
    try:
        data = request.get_json()
        text = data.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        processed = analyze_text(text)
        processed["timestamp"] = int(time.time() * 1000)
        processed["id"] = int(time.time() * 1000) + random.randint(1, 1000)
        processed["status"] = "Pending"
        feed_data.append(processed)
        return jsonify({"message": "Successfully submitted and categorized.", "data": processed})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Start background scraper thread only in local development
    t = threading.Thread(target=background_scraper, daemon=True)
    t.start()
    
    app.run(host="127.0.0.1", debug=True, port=5000)
