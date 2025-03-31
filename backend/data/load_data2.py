import json
import sqlite3
import re
import csv
import os
import math
from datetime import datetime

# Bras Basah coordinates (approximate center)
BRAS_BASAH_LAT = 1.2966
BRAS_BASAH_LON = 103.8517
MAX_DISTANCE_KM = 5  # Maximum 5km radius from Bras Basah

# Function to calculate distance between two coordinates (Haversine formula)
def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth"""
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r

# Function to extract data from Description HTML
def extract_from_description(desc_html, field_name):
    """Extract field value from HTML description"""
    pattern = fr'<th>{field_name}<\/th>\s*<td>([^<]*)<\/td>'
    match = re.search(pattern, desc_html)
    return match.group(1) if match else ''

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
    last_updated TEXT,
    distance_from_bras_basah REAL
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

# Load GeoJSON file
print("Loading GeoJSON data...")
with open('HealthierEateries.geojson', 'r') as file:
    geojson_data = json.load(file)

# Filter stalls within 5km of Bras Basah
bras_basah_stalls = []
for feature in geojson_data['features']:
    geom = feature['geometry']
    lon, lat = geom['coordinates'][0], geom['coordinates'][1]
    
    distance = calculate_distance(BRAS_BASAH_LAT, BRAS_BASAH_LON, lat, lon)
    if distance <= MAX_DISTANCE_KM:
        feature['distance'] = distance  # Add distance to feature
        bras_basah_stalls.append(feature)

# Sort by distance from Bras Basah
bras_basah_stalls.sort(key=lambda x: x['distance'])

# Limit to 100 stalls (or less if there aren't that many within range)
bras_basah_stalls = bras_basah_stalls[:min(100, len(bras_basah_stalls))]

print(f"Found {len(bras_basah_stalls)} stalls within {MAX_DISTANCE_KM}km of Bras Basah.")

# Generate CSV template if it doesn't exist
csv_filename = 'stall_data.csv'
if not os.path.exists(csv_filename):
    print(f"Creating CSV template at {csv_filename}...")
    
    with open(csv_filename, 'w', newline='') as csvfile:
        fieldnames = ['id', 'name', 'cuisine_type', 'price_range', 'dietary_requirements', 
                     'hpb_certified_items', 'hpb_certification_reason', 'avg_calorie_count']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for idx, feature in enumerate(bras_basah_stalls):
            props = feature['properties']
            desc_html = props.get('Description', '')
            
            # Get the correct name from the NAME field inside the Description HTML
            name = extract_from_description(desc_html, 'NAME')
            if not name:
                name = props.get('Name', 'Unknown Eatery')
            
            # Write a row with default values for manual editing
            writer.writerow({
                'id': idx + 1,
                'name': name,
                'cuisine_type': 'Local',
                'price_range': '5-10',
                'dietary_requirements': 'Regular',
                'hpb_certified_items': 'Healthier meal options',
                'hpb_certification_reason': 'Lower in calories',
                'avg_calorie_count': '500'
            })
    
    print(f"CSV template created. Please fill in the actual data in {csv_filename} and then run this script again.")
    print("Exiting without database changes...")
    conn.close()
    exit()

# If we get here, the CSV should exist, so we'll load it
print(f"Loading data from {csv_filename}...")
stall_data = {}
try:
    with open(csv_filename, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            stall_data[row['id']] = row
except FileNotFoundError:
    print(f"Error: {csv_filename} not found. Please run this script first to generate the template.")
    conn.close()
    exit()
except Exception as e:
    print(f"Error reading CSV: {str(e)}")
    conn.close()
    exit()

# Process and insert the stalls with the CSV data
print("Processing stalls and inserting into database...")
for idx, feature in enumerate(bras_basah_stalls):
    stall_id = str(idx + 1)
    if stall_id not in stall_data:
        print(f"Warning: No data found for stall ID {stall_id} in CSV. Skipping...")
        continue
    
    props = feature['properties']
    geom = feature['geometry']
    distance = feature['distance']
    
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
        address_type, last_updated, distance_from_bras_basah
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        updated_date,
        distance
    ))
    
    # Get the stall ID from the database
    db_stall_id = cursor.lastrowid
    
    # Get data from CSV
    csv_data = stall_data[stall_id]
    
    # Insert attribute data from CSV
    cursor.execute('''
    INSERT INTO stall_attributes (
        stall_id, cuisine_type, price_range, dietary_requirements, 
        hpb_certified_items, hpb_certification_reason, avg_calorie_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        db_stall_id,
        csv_data['cuisine_type'],
        csv_data['price_range'],
        csv_data['dietary_requirements'],
        csv_data['hpb_certified_items'],
        csv_data['hpb_certification_reason'],
        int(csv_data['avg_calorie_count'])
    ))
    
    # Print progress
    if (idx + 1) % 10 == 0:
        print(f"Processed {idx + 1} records...")
        conn.commit()

# Commit final changes and close connection
conn.commit()
conn.close()

print("\nData import completed successfully!")
print(f"Imported {len(bras_basah_stalls)} stalls within {MAX_DISTANCE_KM}km of Bras Basah.")
print("The database now contains actual data from your CSV file.")