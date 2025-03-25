# main.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import math

app = FastAPI(title="HPB Food Finder API")

# Add CORS middleware to allow React Native app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for prototyping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection function
def get_db_connection():
    conn = sqlite3.connect('hpb_food_stalls.db')
    conn.row_factory = sqlite3.Row
    return conn

# Pydantic models for data validation
class StallAttribute(BaseModel):
    cuisine_type: str
    price_range: str
    dietary_requirements: str
    avg_calorie_count: int

class Stall(BaseModel):
    id: int
    name: str
    description: str
    address_building: str
    address_postal_code: str
    address_street: str
    address_floor: str
    address_unit: str
    latitude: float
    longitude: float
    attributes: Optional[StallAttribute] = None

# Helper function to calculate distance between two points
def calculate_distance(lat1, lon1, lat2, lon2):
    # Haversine formula
    R = 6371  # Radius of Earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat/2) * math.sin(dLat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon/2) * math.sin(dLon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    return distance

# API Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to HPB Food Finder API"}

@app.get("/stalls", response_model=List[Stall])
def get_stalls(
    latitude: Optional[float] = Query(None, description="User's current latitude"),
    longitude: Optional[float] = Query(None, description="User's current longitude"),
    radius: Optional[float] = Query(1.0, description="Search radius in kilometers"),
    cuisine_type: Optional[str] = Query(None, description="Filter by cuisine type"),
    price_range: Optional[str] = Query(None, description="Filter by price range"),
    dietary: Optional[str] = Query(None, description="Filter by dietary requirements")
):
    conn = get_db_connection()
    
    # Build query based on filters
    query = """
    SELECT s.*, sa.cuisine_type, sa.price_range, sa.dietary_requirements, sa.avg_calorie_count
    FROM stalls s
    JOIN stall_attributes sa ON s.id = sa.stall_id
    WHERE 1=1
    """
    params = []
    
    if cuisine_type:
        query += " AND sa.cuisine_type = ?"
        params.append(cuisine_type)
    
    if price_range:
        query += " AND sa.price_range = ?"
        params.append(price_range)
    
    if dietary:
        query += " AND sa.dietary_requirements LIKE ?"
        params.append(f"%{dietary}%")
    
    results = conn.execute(query, params).fetchall()
    
    # Filter by distance if coordinates are provided
    stalls = []
    for row in results:
        stall_data = dict(row)
        
        # If user location is provided, calculate distance and filter by radius
        if latitude and longitude:
            distance = calculate_distance(
                latitude, longitude, 
                stall_data['latitude'], stall_data['longitude']
            )
            
            # Skip stalls outside the search radius
            if distance > radius:
                continue
                
            # Add distance to stall data
            stall_data['distance'] = round(distance, 2)
        
        # Format the stall data to match Pydantic model
        attributes = {
            'cuisine_type': stall_data.pop('cuisine_type'),
            'price_range': stall_data.pop('price_range'),
            'dietary_requirements': stall_data.pop('dietary_requirements'),
            'avg_calorie_count': stall_data.pop('avg_calorie_count')
        }
        
        stall_data['attributes'] = attributes
        stalls.append(stall_data)
    
    # Sort by distance if coordinates were provided
    if latitude and longitude:
        stalls.sort(key=lambda x: x.get('distance', float('inf')))
    
    conn.close()
    return stalls

@app.get("/stalls/{stall_id}", response_model=Stall)
def get_stall(stall_id: int):
    conn = get_db_connection()
    
    # Get stall details and attributes
    query = """
    SELECT s.*, sa.cuisine_type, sa.price_range, sa.dietary_requirements, sa.avg_calorie_count
    FROM stalls s
    JOIN stall_attributes sa ON s.id = sa.stall_id
    WHERE s.id = ?
    """
    result = conn.execute(query, (stall_id,)).fetchone()
    
    if not result:
        conn.close()
        raise HTTPException(status_code=404, detail="Stall not found")
    
    stall_data = dict(result)
    
    # Format the stall data to match Pydantic model
    attributes = {
        'cuisine_type': stall_data.pop('cuisine_type'),
        'price_range': stall_data.pop('price_range'),
        'dietary_requirements': stall_data.pop('dietary_requirements'),
        'avg_calorie_count': stall_data.pop('avg_calorie_count')
    }
    
    stall_data['attributes'] = attributes
    conn.close()
    
    return stall_data

@app.get("/filters")
def get_filters():
    """Get the list of available filters for the app"""
    conn = get_db_connection()
    
    # Get all distinct cuisine types
    cuisine_types = conn.execute(
        "SELECT DISTINCT cuisine_type FROM stall_attributes WHERE cuisine_type != 'Unknown'"
    ).fetchall()
    
    # Get all distinct price ranges
    price_ranges = conn.execute(
        "SELECT DISTINCT price_range FROM stall_attributes WHERE price_range != 'Unknown'"
    ).fetchall()
    
    # Get all distinct dietary requirements
    dietary_reqs = conn.execute(
        "SELECT DISTINCT dietary_requirements FROM stall_attributes WHERE dietary_requirements != 'Unknown'"
    ).fetchall()
    
    conn.close()
    
    return {
        "cuisine_types": [row['cuisine_type'] for row in cuisine_types],
        "price_ranges": [row['price_range'] for row in price_ranges],
        "dietary_requirements": [row['dietary_requirements'] for row in dietary_reqs]
    }
    