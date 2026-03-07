import re
import random

# A simple keyword-to-category mapping for this MVP
CATEGORIES = {
    "medical": ["hospital", "doctor", "bleeding", "injured", "medical", "ambulance", "hurt"],
    "food": ["food", "starving", "hungry", "water", "thirsty", "ration", "grocery"],
    "rescue": ["trapped", "stuck", "drowning", "help", "save", "rescue", "roof"],
    "infrastructure": ["road blocked", "bridge", "power", "electricity", "downed", "blocked", "rubble", "fire"]
}

# Global dictionary mapping locations to mock coordinates
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
            
    # Extract location entity
    extracted_location = None
    coords = None
    for loc_name, loc_coords in LOCATION_COORDS.items():
        if loc_name in text_lower:
            extracted_location = loc_name
            # Add a slight random jitter to prevent markers stacking perfectly
            coords = {
                "lat": loc_coords["lat"] + random.uniform(-0.002, 0.002),
                "lng": loc_coords["lng"] + random.uniform(-0.002, 0.002)
            }
            break
            
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
    print(analyze_text("We need water in Tokyo immediately!"))
    print(analyze_text("Road blocked at highway 1, somewhere in rural areas"))
