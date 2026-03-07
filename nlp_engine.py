import re
import random
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

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
    Very basic NLP:
    1. Categorize based on keywords.
    2. Extract location based on predefined dictionary.
    """
    text_lower = text.lower()
    
    # Identify category
    identified_category = "other"  # default
    for category, keywords in CATEGORIES.items():
        if any(keyword in text_lower for keyword in keywords):
            identified_category = category
            break
            
    # 2. Extract and Geocode location
    extracted_location = extract_potential_location(text)
    coords = None
    
    if extracted_location:
        try:
            # Try to get real coordinates from OpenStreetMap
            location = geolocator.geocode(extracted_location, timeout=3)
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
