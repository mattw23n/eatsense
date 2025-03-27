// Updated HomeScreen.js with "Search This Area" button
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  Platform,
  SafeAreaView,
  Animated
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import StallListView from '../components/StallListView';

export default function HomeScreen({ navigation }) {
  // Add a ref to the map to control it programmatically
  const mapRef = useRef(null);
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  
  // State for map region and search area button
  const [initialRegion, setInitialRegion] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);
  const [searchAreaButtonOpacity] = useState(new Animated.Value(0));
  
  const [filters, setFilters] = useState({
    cuisine_type: null,
    price_range: null,
    dietary: null,
    radius: 2 // Default 2km radius
  });

  // Get user location and nearby stalls
  useEffect(() => {
    (async () => {
      // Get location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // Get user location
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      
      // Set initial map region
      const initialRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setInitialRegion(initialRegion);
      setCurrentRegion(initialRegion);
      
      // Fetch nearby stalls
      fetchStalls(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    if (location) {
      fetchStalls(location.coords.latitude, location.coords.longitude);
    }
  }, [filters]);

  // Fetch stalls from API
  const fetchStalls = async (latitude, longitude, useCurrentRadius = true) => {
    setLoading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        latitude,
        longitude,
        radius: useCurrentRadius ? filters.radius : calculateRequiredRadius()
      });
      
      if (filters.cuisine_type) queryParams.append('cuisine_type', filters.cuisine_type);
      if (filters.price_range) queryParams.append('price_range', filters.price_range);
      if (filters.dietary) queryParams.append('dietary', filters.dietary);
      
      // Make API request
      const response = await fetch(`${API_URL}/stalls?${queryParams}`);
      const data = await response.json();
      setStalls(data);
      
      // Hide search area button after search
      setShowSearchAreaButton(false);
      fadeOutSearchButton();
    } catch (error) {
      console.error('Error fetching stalls:', error);
      setErrorMsg('Failed to load stalls. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle stall selection
  const handleStallPress = (stall) => {
    navigation.navigate('StallDetail', { 
      stallId: stall.id,
      stallName: stall.name
    });
  };

  // Open filter screen
  const handleFilterPress = () => {
    navigation.navigate('Filter', {
      currentFilters: filters,
      onFilterChange: (newFilters) => setFilters(newFilters)
    });
  };

  // Toggle between map and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'map' ? 'list' : 'map');
  };
  
  // Calculate the distance between two coordinates (in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  // Check if the current map view is outside the search radius
  const isOutsideSearchRadius = () => {
    if (!initialRegion || !currentRegion) return false;
    
    const distance = calculateDistance(
      initialRegion.latitude,
      initialRegion.longitude,
      currentRegion.latitude,
      currentRegion.longitude
    );
    
    // If the map center has moved more than 50% of the radius, show the button
    return distance > (filters.radius * 0.5);
  };
  
  // Calculate the required radius for the current map view
  const calculateRequiredRadius = () => {
    if (!currentRegion) return filters.radius;
    
    // Calculate distance from center to edge of visible region (approximation)
    const latDelta = currentRegion.latitudeDelta / 2;
    const lonDelta = currentRegion.longitudeDelta / 2;
    
    const distance = calculateDistance(
      currentRegion.latitude,
      currentRegion.longitude,
      currentRegion.latitude + latDelta,
      currentRegion.longitude + lonDelta
    );
    
    // Add a small buffer and round up to nearest 0.5
    const requiredRadius = Math.ceil((distance * 2) / 0.5) * 0.5;
    return Math.max(requiredRadius, 1); // Minimum 1km radius
  };
  
  // Handle map region change
  const handleRegionChange = (region) => {
    setCurrentRegion(region);
    
    if (isOutsideSearchRadius() && !showSearchAreaButton) {
      setShowSearchAreaButton(true);
      fadeInSearchButton();
    } else if (!isOutsideSearchRadius() && showSearchAreaButton) {
      setShowSearchAreaButton(false);
      fadeOutSearchButton();
    }
  };
  
  // Handle "Search This Area" button press
  const handleSearchAreaPress = () => {
    if (currentRegion) {
      // Search using the current map center and calculate a new appropriate radius
      fetchStalls(currentRegion.latitude, currentRegion.longitude, false);
      
      // Update the initial region to the current one
      setInitialRegion(currentRegion);
    }
  };
  
  // Fade in animation for search button
  const fadeInSearchButton = () => {
    Animated.timing(searchAreaButtonOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Fade out animation for search button
  const fadeOutSearchButton = () => {
    Animated.timing(searchAreaButtonOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getEstimatedWalkingTime = (radiusKm) => {
    // Average walking speed is around 5 km/h
    // So to walk across the diameter (2 * radius) would take:
    const walkingTimeHours = (2 * radiusKm) / 5;
    const walkingTimeMinutes = Math.round(walkingTimeHours * 60);
    
    if (walkingTimeMinutes < 1) {
      return "< 1 min";
    } else if (walkingTimeMinutes === 1) {
      return "1 min";
    } else if (walkingTimeMinutes < 60) {
      return `${walkingTimeMinutes} mins`;
    } else {
      const hours = Math.floor(walkingTimeMinutes / 60);
      const mins = walkingTimeMinutes % 60;
      if (mins === 0) {
        return `${hours} hr`;
      } else {
        return `${hours} hr ${mins} mins`;
      }
    }
  };

  // Loading view
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Finding healthy food options...</Text>
      </View>
    );
  }

  // Error view
  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => location && fetchStalls(location.coords.latitude, location.coords.longitude)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Default location (Singapore center) if user location is not available
  const mapRegion = initialRegion || {
    latitude: 1.3521, // Singapore
    longitude: 103.8198,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map or List View */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView 
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation
            showsMyLocationButton
            onRegionChangeComplete={handleRegionChange}
          >
            {stalls.map((stall) => (
              <Marker
                key={stall.id}
                coordinate={{
                  latitude: stall.latitude,
                  longitude: stall.longitude
                }}
                title={stall.name}
                description={stall.description}
                onPress={() => handleStallPress(stall)}
              />
            ))}
          </MapView>
          
          {/* Search This Area Button */}
          <Animated.View 
            style={[
              styles.searchAreaButtonContainer, 
              { opacity: searchAreaButtonOpacity }
            ]}
            pointerEvents={showSearchAreaButton ? 'auto' : 'none'}
          >
            <TouchableOpacity 
              style={styles.searchAreaButton}
              onPress={handleSearchAreaPress}
            >
              <Text style={styles.searchAreaButtonText}>Search This Area</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Current radius indicator */}
          <View style={styles.radiusIndicator}>
            <View style={styles.radiusTextContainer}>
              <Text style={styles.radiusText}>
                Showing stalls within {filters.radius} km
              </Text>
              <Text style={styles.walkingTimeText}>
                ≈ {getEstimatedWalkingTime(filters.radius)} walking time
              </Text>
            </View>
            <Ionicons name="walk" size={16} color="#555" style={styles.walkIcon} />
          </View>
        </View>
        
      ) : (
        <StallListView 
          stalls={stalls} 
          onStallPress={handleStallPress} 
        />
      )}
      
      {/* Footer with controls */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={handleFilterPress}
        >
          <Ionicons name="filter" size={24} color="#333" />
          <Text style={styles.buttonText}>Filter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={toggleViewMode}
        >
          <Ionicons 
            name={viewMode === 'map' ? 'list' : 'map'} 
            size={24} 
            color="#333" 
          />
          <Text style={styles.buttonText}>
            {viewMode === 'map' ? 'List View' : 'Map View'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  searchAreaButtonContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
  },
  searchAreaButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchAreaButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  buttonText: {
    marginTop: 5,
    fontSize: 12,
  },
  radiusIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusTextContainer: {
    flex: 1,
  },
  radiusText: {
    fontSize: 12,
    color: '#555',
  },
  walkingTimeText: {
    fontSize: 10,
    color: '#777',
    marginTop: 2,
  },
  walkIcon: {
    marginLeft: 2,
  },
});