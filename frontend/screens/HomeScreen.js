import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  Platform,
  SafeAreaView
} from 'react-native';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import StallListView from '../components/StallListView';

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
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
  const fetchStalls = async (latitude, longitude) => {
    setLoading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        latitude,
        longitude,
        radius: filters.radius
      });
      
      if (filters.cuisine_type) queryParams.append('cuisine_type', filters.cuisine_type);
      if (filters.price_range) queryParams.append('price_range', filters.price_range);
      if (filters.dietary) queryParams.append('dietary', filters.dietary);
      
      // Make API request
      const response = await fetch(`${API_URL}/stalls?${queryParams}`);
      const data = await response.json();
      setStalls(data);
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
  const mapRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : {
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
        <MapView 
          style={styles.map}
          // provider={PROVIDER_GOOGLE}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton
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
});