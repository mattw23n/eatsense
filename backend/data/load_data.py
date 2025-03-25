import json
import sqlite3
import re
from datetime import datetime

# Connect to SQLite database (creates it if it doesn't exist)
conn = sqlite3.connect('hpb_food_stalls.db')
cursor = conn.cursor()

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
    avg_calorie_count INTEGER,
    FOREIGN KEY (stall_id) REFERENCES stalls (id)
)
''')

# Load GeoJSON file
with open('HealthierEateries.geojson', 'r') as file:
    geojson_data = json.load(file)

# Parse and insert data
for feature in geojson_data['features']:
    props = feature['properties']
    geom = feature['geometry']
    
    # Extract data from Description field (HTML table)
    desc_html = props.get('Description', '')
    
    # Extract values using regex patterns
    block_house_number = re.search(r'<th>ADDRESSBLOCKHOUSENUMBER<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    block_house_number = block_house_number.group(1) if block_house_number else ''
    
    building_name = re.search(r'<th>ADDRESSBUILDINGNAME<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    building_name = building_name.group(1) if building_name else ''
    
    postal_code = re.search(r'<th>ADDRESSPOSTALCODE<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    postal_code = postal_code.group(1) if postal_code else ''
    
    street_name = re.search(r'<th>ADDRESSSTREETNAME<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    street_name = street_name.group(1) if street_name else ''
    
    floor_number = re.search(r'<th>ADDRESSFLOORNUMBER<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    floor_number = floor_number.group(1) if floor_number else ''
    
    unit_number = re.search(r'<th>ADDRESSUNITNUMBER<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    unit_number = unit_number.group(1) if unit_number else ''
    
    address_type = re.search(r'<th>ADDRESSTYPE<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    address_type = address_type.group(1) if address_type else ''
    
    description = re.search(r'<th>DESCRIPTION<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    description = description.group(1) if description else ''
    
    updated_date = re.search(r'<th>FMEL_UPD_D<\/th>\s*<td>([^<]*)<\/td>', desc_html)
    updated_date = updated_date.group(1) if updated_date else ''
    
    name = props.get('Name', '')
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
        props.get('Name', ''),
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
    
    # For now, add placeholder data for attributes (to be updated later)
    # In a real app, you'd add a way to manage this data
    cursor.execute('''
    INSERT INTO stall_attributes (
        stall_id, cuisine_type, price_range, dietary_requirements, avg_calorie_count
    ) VALUES (?, ?, ?, ?, ?)
    ''', (
        stall_id,
        'Unknown',  # Placeholder, would need to be updated
        'Unknown',  # Placeholder
        'Unknown',  # Placeholder
        0           # Placeholder
    ))

# Commit changes and close connection
conn.commit()
conn.close()

print("Data import completed successfully!")