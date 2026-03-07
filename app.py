from flask import Flask, jsonify, render_template, request
import time
import random
import threading
from nlp_engine import analyze_text

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
        feed_data.append(processed)
        
    while True:
        time.sleep(random.randint(5, 12))  # New feed every 5-12 seconds
        text = random.choice(MOCK_FEEDS)
        processed = analyze_text(text)
        processed["timestamp"] = int(time.time() * 1000)
        
        # Keep only the latest 100
        feed_data.append(processed)
        if len(feed_data) > 100:
            feed_data.pop(0)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/feeds", methods=["GET"])
def get_feeds():
    # Return the latest feeds
    return jsonify(feed_data)

@app.route("/api/submit", methods=["POST"])
def submit_feed():
    try:
        data = request.get_json()
        text = data.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        processed = analyze_text(text)
        processed["timestamp"] = int(time.time() * 1000)
        feed_data.append(processed)
        return jsonify({"message": "Successfully submitted and categorized.", "data": processed})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Start background scraper thread
    t = threading.Thread(target=background_scraper, daemon=True)
    t.start()
    
    app.run(host="0.0.0.0", debug=True, port=5000, use_reloader=False)
