import json
import sqlite3
import re
import time
import random
from datetime import datetime
import requests
import os
from urllib.parse import quote_plus

# Set your Google Maps API key here if you decide to use it
# GOOGLE_MAPS_API_KEY = "YOUR_API_KEY"

# Connect to SQLite database (creates it if it doesn't exist)
conn = sqlite3.connect('hpb_food_stalls.db')
cursor = conn.cursor()

# Drop existing tables if they exist for a clean start
cursor.execute('DROP TABLE IF EXISTS stall_attributes')
cursor.execute('DROP TABLE IF EXISTS stalls')

# Create tables
cursor.execute('''
CREATE TABLE IF NOT EXISTS stalls (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    address_block TEXT,
    address_building TEXT,
    address_postal_code TEXT,
    address_street TEXT,
    address_floor TEXT,
    address_unit TEXT,
    latitude REAL,
    longitude REAL,
    address_type TEXT,
    last_updated TEXT
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS stall_attributes (
    id INTEGER PRIMARY KEY,
    stall_id INTEGER,
    cuisine_type TEXT,
    price_range TEXT,
    dietary_requirements TEXT,
    hpb_certified_items TEXT,
    hpb_certification_reason TEXT,
    avg_calorie_count INTEGER,
    FOREIGN KEY (stall_id) REFERENCES stalls (id)
)
''')

# Function to extract data from Description HTML
def extract_from_description(desc_html, field_name):
    pattern = fr'<th>{field_name}<\/th>\s*<td>([^<]*)<\/td>'
    match = re.search(pattern, desc_html)
    return match.group(1) if match else ''

# Function to get cuisine type based on restaurant name and description
def get_cuisine_type(name, description):
    # Dictionary mapping keywords to cuisine types
    cuisine_keywords = {
        'chinese': ['chinese', 'dim sum', 'wonton', 'dumpling', 'noodle', 'stir fry', 'szechuan', 'cantonese'],
        'western': ['burger', 'pizza', 'pasta', 'steak', 'grill', 'western', 'burger king', 'mcdonald', 'kfc', 'subway'],
        'japanese': ['japanese', 'sushi', 'sashimi', 'ramen', 'udon', 'donburi', 'tempura', 'sakae'],
        'korean': ['korean', 'kimchi', 'bibimbap', 'bulgogi', 'gochujang'],
        'indian': ['indian', 'curry', 'masala', 'tandoori', 'naan', 'biryani'],
        'malay': ['malay', 'nasi', 'mee', 'satay', 'rendang'],
        'thai': ['thai', 'tom yum', 'pad thai', 'green curry'],
        'vietnamese': ['vietnamese', 'pho', 'banh mi'],
        'cafe': ['cafe', 'coffee', 'bakery', 'pastry', 'bread', 'cake', 'swissbake'],
        'fast food': ['fast food', 'mcdonald', 'burger king', 'kfc', 'subway'],
        'local': ['hawker', 'kopitiam', 'food court', 'local', 'singapore'],
        'vegetarian': ['vegetarian', 'vegan'],
        'seafood': ['seafood', 'fish', 'crab', 'prawn'],
        'dessert': ['dessert', 'ice cream', 'yogurt', 'sweet']
    }
    
    name_lower = name.lower()
    desc_lower = description.lower() if description else ""
    
    # Check for specific restaurant chains
    if 'din tai fung' in name_lower:
        return 'Chinese'
    elif 'sakae sushi' in name_lower:
        return 'Japanese'
    elif 'simply wrapps' in name_lower:
        return 'Western'
    elif 'burger king' in name_lower:
        return 'Fast Food'
    elif 'mcdonald' in name_lower:
        return 'Fast Food'
    elif 'subway' in name_lower:
        return 'Fast Food'
    elif 'kfc' in name_lower:
        return 'Fast Food'
    elif 'swissbake' in name_lower:
        return 'Cafe'
    
    # Check for cuisine keywords in name and description
    combined_text = f"{name_lower} {desc_lower}"
    for cuisine, keywords in cuisine_keywords.items():
        for keyword in keywords:
            if keyword in combined_text:
                return cuisine.capitalize()
    
    # Default if no match found
    return 'Local'

# Function to determine price range based on restaurant type and location
def get_price_range(name, building):
    # Upscale malls tend to have more expensive restaurants
    upscale_malls = ['marina bay sands', 'ion orchard', 'paragon', 'raffles city', 
                     'jewel changi', 'ngee ann city', 'vivocity']
    
    # Chain restaurants with known price ranges
    budget_chains = ['mcdonald', 'kfc', 'burger king', 'subway', 'kopitiam', 'food court']
    mid_range_chains = ['din tai fung', 'sakae sushi', 'swensen', 'sushi tei']
    high_range_chains = ['crystal jade', 'paradise dynasty', 'jumbo seafood']
    
    name_lower = name.lower()
    building_lower = building.lower() if building else ""
    
    # Check if in upscale mall
    in_upscale_mall = any(mall in building_lower for mall in upscale_malls)
    
    # Check for specific price categories
    if any(chain in name_lower for chain in high_range_chains):
        return '20-30'
    elif any(chain in name_lower for chain in mid_range_chains):
        return '15-20'
    elif any(chain in name_lower for chain in budget_chains):
        return '5-10'
    elif in_upscale_mall:
        return '15-20'
    
    # Default based on type of cuisine (from name)
    if 'cafe' in name_lower or 'coffee' in name_lower:
        return '5-10'
    elif 'restaurant' in name_lower:
        return '15-20'
    elif 'fast food' in name_lower:
        return '5-10'
    
    # Random assignment with weighted probabilities
    price_ranges = ['1-5', '5-10', '10-15', '15-20', '20-25', '25-30', '30+']
    weights = [0.05, 0.35, 0.30, 0.20, 0.05, 0.03, 0.02]
    return random.choices(price_ranges, weights=weights)[0]

# Function to determine dietary requirements
def get_dietary_requirements(name, cuisine_type):
    requirements = []
    
    # Check for vegetarian/vegan restaurants
    name_lower = name.lower()
    if 'vegetarian' in name_lower or 'vegan' in name_lower:
        requirements.append('Vegetarian')
        requirements.append('Vegan Options')
    
    # Check for halal certification mentions
    if 'halal' in name_lower:
        requirements.append('Halal')
    
    # Add likely dietary options based on cuisine
    cuisine_lower = cuisine_type.lower()
    
    if cuisine_lower == 'indian':
        if random.random() < 0.7:  # 70% chance
            requirements.append('Vegetarian Options')
        if random.random() < 0.4:  # 40% chance
            requirements.append('Halal')
    
    elif cuisine_lower == 'chinese':
        if random.random() < 0.3:  # 30% chance
            requirements.append('Vegetarian Options')
    
    elif cuisine_lower == 'japanese' or cuisine_lower == 'seafood':
        if random.random() < 0.8:  # 80% chance
            requirements.append('Pescatarian')
    
    elif cuisine_lower == 'western':
        if random.random() < 0.5:  # 50% chance
            requirements.append('Vegetarian Options')
    
    # Add gluten-free options randomly with smaller probability
    if random.random() < 0.15:  # 15% chance
        requirements.append('Gluten-Free Options')
    
    # If no requirements identified, add default
    if not requirements:
        if random.random() < 0.5:
            requirements.append('Vegetarian Options')
    
    return ', '.join(set(requirements))  # Remove duplicates

# Function to generate HPB certified items
def get_hpb_certified_items(cuisine_type):
    # Dictionary of cuisine types and possible healthier dishes
    cuisine_dishes = {
        'Chinese': ['Steamed Fish', 'Boiled Vegetables', 'Clear Soup', 'Brown Rice', 'Steamed Chicken'],
        'Western': ['Grilled Chicken Salad', 'Whole Grain Sandwich', 'Vegetable Soup', 'Baked Fish', 'Quinoa Bowl'],
        'Japanese': ['Sashimi', 'Tofu Salad', 'Miso Soup', 'Grilled Salmon', 'Brown Rice Bowl'],
        'Korean': ['Bibimbap with Brown Rice', 'Steamed Tofu', 'Vegetable Banchan', 'Grilled Fish', 'Kimchi Soup'],
        'Indian': ['Tandoori Chicken', 'Daal', 'Vegetable Curry', 'Raita', 'Chapati'],
        'Malay': ['Grilled Fish', 'Sayur Lodeh', 'Ulam Salad', 'Sup Ayam', 'Brown Rice Nasi Lemak'],
        'Thai': ['Tom Yum Soup', 'Papaya Salad', 'Steamed Fish', 'Stir-Fried Vegetables', 'Brown Rice'],
        'Vietnamese': ['Pho with Lean Meat', 'Fresh Spring Rolls', 'Goi Cuon', 'Grilled Fish', 'Vietnamese Salad'],
        'Fast Food': ['Grilled Chicken Burger', 'Side Salad', 'Corn Cup', 'Wholegrain Wrap', 'Veggie Burger'],
        'Local': ['Sliced Fish Soup', 'Yong Tau Foo', 'Thunder Tea Rice', 'Steamed Chicken Rice', 'Vegetable Soup'],
        'Cafe': ['Whole Grain Sandwich', 'Fruit Bowl', 'Overnight Oats', 'Greek Yogurt Parfait', 'Avocado Toast'],
        'Seafood': ['Steamed Fish', 'Grilled Prawns', 'Seafood Soup', 'Stir-Fried Vegetables', 'Brown Rice'],
        'Vegetarian': ['Tofu Stir-Fry', 'Vegetable Soup', 'Mixed Grain Rice', 'Mushroom Salad', 'Steamed Vegetables'],
        'Dessert': ['Fresh Fruit Platter', 'Yogurt Parfait', 'Sugar-Free Jelly', 'Fruit Sorbet', 'Low-Fat Frozen Yogurt']
    }
    
    # Default to Local if cuisine not found
    dishes = cuisine_dishes.get(cuisine_type, cuisine_dishes['Local'])
    
    # Select 1-3 random dishes
    num_dishes = random.randint(1, 3)
    certified_dishes = random.sample(dishes, min(num_dishes, len(dishes)))
    
    return ', '.join(certified_dishes)

# Function to get certification reason
def get_certification_reason():
    reasons = [
        'Lower in calories', 
        'Lower in sugar', 
        'Lower in sodium', 
        'Higher in whole grains',
        'Higher in fiber',
        'Trans fat-free', 
        'No added MSG',
        'Uses healthier oil',
        'Lower in saturated fat',
        'Balanced meal option'
    ]
    
    # Select 1-3 random reasons
    num_reasons = random.randint(1, 3)
    selected_reasons = random.sample(reasons, num_reasons)
    
    return ', '.join(selected_reasons)

# Function to estimate average calorie count
def get_avg_calorie_count(cuisine_type, price_range):
    # Base calorie ranges by cuisine type
    cuisine_calories = {
        'Chinese': (450, 700),
        'Western': (600, 900),
        'Japanese': (400, 650),
        'Korean': (500, 750),
        'Indian': (550, 800),
        'Malay': (500, 750),
        'Thai': (450, 700),
        'Vietnamese': (400, 600),
        'Fast Food': (650, 1000),
        'Local': (500, 750),
        'Cafe': (350, 600),
        'Seafood': (400, 650),
        'Vegetarian': (350, 550),
        'Dessert': (300, 500)
    }
    
    # Default to Local if cuisine not found
    calorie_range = cuisine_calories.get(cuisine_type, cuisine_calories['Local'])
    
    # Calculate with slight randomization
    min_cal, max_cal = calorie_range
    avg_cal = random.randint(min_cal, max_cal)
    
    # Adjust for HPB certification (healthier options tend to be lower in calories)
    avg_cal = int(avg_cal * 0.85)  # 15% reduction
    
    # Round to nearest 25
    avg_cal = round(avg_cal / 25) * 25
    
    return avg_cal

# Load GeoJSON file
with open('HealthierEateries.geojson', 'r') as file:
    geojson_data = json.load(file)

print(f"Loading {len(geojson_data['features'])} features from GeoJSON file...")

# Parse and insert data
for idx, feature in enumerate(geojson_data['features']):
    props = feature['properties']
    geom = feature['geometry']
    
    # Extract data from Description field (HTML table)
    desc_html = props.get('Description', '')
    
    # Get the correct name from the NAME field inside the Description HTML
    name = extract_from_description(desc_html, 'NAME')
    if not name:
        name = props.get('Name', 'Unknown Eatery')
    
    # Extract other fields
    block_house_number = extract_from_description(desc_html, 'ADDRESSBLOCKHOUSENUMBER')
    building_name = extract_from_description(desc_html, 'ADDRESSBUILDINGNAME')
    postal_code = extract_from_description(desc_html, 'ADDRESSPOSTALCODE')
    street_name = extract_from_description(desc_html, 'ADDRESSSTREETNAME')
    floor_number = extract_from_description(desc_html, 'ADDRESSFLOORNUMBER')
    unit_number = extract_from_description(desc_html, 'ADDRESSUNITNUMBER')
    address_type = extract_from_description(desc_html, 'ADDRESSTYPE')
    description = extract_from_description(desc_html, 'DESCRIPTION')
    updated_date = extract_from_description(desc_html, 'FMEL_UPD_D')
    
    latitude = geom['coordinates'][1]  # GeoJSON is [lon, lat]
    longitude = geom['coordinates'][0]
    
    # Insert into stalls table
    cursor.execute('''
    INSERT INTO stalls (
        name, description, address_block, address_building, address_postal_code,
        address_street, address_floor, address_unit, latitude, longitude,
        address_type, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        name,
        description,
        block_house_number,
        building_name,
        postal_code,
        street_name,
        floor_number,
        unit_number,
        latitude,
        longitude,
        address_type,
        updated_date
    ))
    
    # Get the stall ID
    stall_id = cursor.lastrowid
    
    # Generate enriched data
    cuisine_type = get_cuisine_type(name, description)
    price_range = get_price_range(name, building_name)
    dietary_requirements = get_dietary_requirements(name, cuisine_type)
    hpb_certified_items = get_hpb_certified_items(cuisine_type)
    hpb_certification_reason = get_certification_reason()
    avg_calorie_count = get_avg_calorie_count(cuisine_type, price_range)
    
    # Insert enriched data into stall_attributes table
    cursor.execute('''
    INSERT INTO stall_attributes (
        stall_id, cuisine_type, price_range, dietary_requirements, 
        hpb_certified_items, hpb_certification_reason, avg_calorie_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        stall_id,
        cuisine_type,
        price_range,
        dietary_requirements,
        hpb_certified_items,
        hpb_certification_reason,
        avg_calorie_count
    ))
    
    # Print progress every 10 records
    if (idx + 1) % 10 == 0:
        print(f"Processed {idx + 1} records...")
        # Commit changes periodically to avoid losing all data if script fails
        conn.commit()

# Commit final changes and close connection
conn.commit()
conn.close()

print("Enhanced data import completed successfully!")
print("Added enriched data with cuisine types, price ranges, dietary requirements, and HPB certifications.")