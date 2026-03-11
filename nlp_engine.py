import os
import re
import json
import random
from google import genai
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None

# Initialize the Geocoder (using OpenStreetMap data)
geolocator = Nominatim(user_agent="nexoraa_disaster_app")

# A simple keyword-to-category mapping for this MVP
CATEGORIES = {
    "medical": ["hospital", "doctor", "bleeding", "injured", "medical", "ambulance", "hurt"],
    "food": ["food", "starving", "hungry", "water", "thirsty", "ration", "grocery"],
    "rescue": ["trapped", "stuck", "drowning", "help", "save", "rescue", "roof"],
    "infrastructure": ["road blocked", "bridge", "power", "electricity", "downed", "blocked", "rubble", "fire"]
}

# Legacy fallback locations if API fails
LOCATION_COORDS = {
    "tokyo": {"lat": 35.6762, "lng": 139.6503},
    "new york": {"lat": 40.7128, "lng": -74.0060},
    "london": {"lat": 51.5074, "lng": -0.1278},
    "sydney": {"lat": -33.8688, "lng": 151.2093},
    "mumbai": {"lat": 19.0760, "lng": 72.8777},
    "cape town": {"lat": -33.9249, "lng": 18.4241},
    "sao paulo": {"lat": -23.5505, "lng": -46.6333},
    "cairo": {"lat": 30.0444, "lng": 31.2357},
    "istanbul": {"lat": 41.0082, "lng": 28.9784},
    "beijing": {"lat": 39.9042, "lng": 116.4074}
}

def extract_potential_location(text):
    """
    Looks for location keywords following prepositions like 'in', 'at', 'near'.
    """
    match = re.search(r'\b(in|at|near|around)\s+([a-zA-Z\s]+)', text, re.IGNORECASE)
    if match:
        phrase = match.group(2).strip()
        # Clean up common words that might follow a location
        words = phrase.split()
        loc_words = []
        stop_words = ['immediately', 'people', 'send', 'someone', 'please', 'we', 'any', 'huge', 'buildings', 'need', 'the', 'a', 'an', 'is', 'are', 'was', 'were']
        for w in words:
            if w.lower() in stop_words:
                break
            loc_words.append(w)
        if loc_words:
            return " ".join(loc_words)
    
    # Fallback to checking if any known word is just mentioned
    for loc in LOCATION_COORDS.keys():
        if loc in text.lower():
            return loc
            
    return None

def analyze_text(text):
    """
    NLP Engine: Uses Gemini (if available) or falls back to basic keyword matching.
    """
    text_lower = text.lower()
    
    identified_category = "other"
    extracted_location = None
    
    if client:
        try:
            prompt = f"Analyze the following disaster distress text which may be in Hindi, Gujarati, or any regional language. First, translate it to English. Then, extract the Category (one of: medical, food, rescue, infrastructure, other) and the specific Location mentioned. If no specific location is mentioned, return null for location. Return ONLY a valid JSON object in this format: {{\"category\": \"...\", \"location_name\": \"...\"}}. Text: '{text}'"
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            json_str = re.search(r'\{.*\}', response.text, re.DOTALL).group()
            result = json.loads(json_str)
            identified_category = result.get("category", "other").lower()
            extracted_location = result.get("location_name")
        except Exception as e:
            print(f"Gemini API error: {e}")
            pass
            
    if not client or identified_category == "other" or not extracted_location:
        # Fallback to basic NLP
        for category, keywords in CATEGORIES.items():
            if any(keyword in text_lower for keyword in keywords):
                identified_category = category
                break
        if not extracted_location:
            extracted_location = extract_potential_location(text)
            
    # Geocode location
    coords = None
    
    if extracted_location:
        try:
            # Try to get real coordinates from Geocoder
            location = geolocator.geocode(extracted_location, timeout=5)
            if location:
                extracted_location = location.address.split(",")[0] # Get the primary name
                coords = {
                    "lat": location.latitude + random.uniform(-0.002, 0.002),
                    "lng": location.longitude + random.uniform(-0.002, 0.002)
                }
        except Exception:
            pass # Fall back to mock dict if network request fails

    # If geocoding failed or didn't find anything, try the mock fallback dict
    if coords is None and extracted_location:
        extracted_location_lower = extracted_location.lower()
        if extracted_location_lower in LOCATION_COORDS:
            loc_coords = LOCATION_COORDS[extracted_location_lower]
            coords = {
                "lat": loc_coords["lat"] + random.uniform(-0.002, 0.002),
                "lng": loc_coords["lng"] + random.uniform(-0.002, 0.002)
            }
            
    # Fallback if no specific location matched, generate a random one globally
    if coords is None:
        extracted_location = "Global (unknown)"
        coords = {
                "lat": random.uniform(-60, 60), # Keep mostly habitable latitudes
                "lng": random.uniform(-180, 180)
        }

    return {
        "text": text,
        "category": identified_category,
        "location_name": extracted_location,
        "lat": coords["lat"],
        "lng": coords["lng"],
        "urgency": "high" if identified_category in ["medical", "rescue"] else "medium"
    }

if __name__ == "__main__":
    # Test
    print(analyze_text("We need water in Surat immediately!"))
    print(analyze_text("Road blocked at highway 1, somewhere in rural areas"))
