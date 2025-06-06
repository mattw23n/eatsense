// StallDetailScreen.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { API_URL } from '../config';

export default function StallDetailScreen({ route, navigation }) {
  const { stallId, stallName } = route.params;
  const [stall, setStall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStallDetails();
  }, []);

  const fetchStallDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/stalls/${stallId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stall details');
      }
      const data = await response.json();
      setStall(data);
    } catch (error) {
      console.error('Error fetching stall details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    if (stall) {
      const url = Platform.select({
        ios: `maps:?q=${stall.name}&ll=${stall.latitude},${stall.longitude}`,
        android: `geo:${stall.latitude},${stall.longitude}?q=${stall.name}`
      });
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading stall details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStallDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stall) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Stall information not found</Text>
      </View>
    );
  }

  // Build full address
  const fullAddress = [
    stall.address_block,
    stall.address_building,
    stall.address_street,
    `#${stall.address_floor}-${stall.address_unit}`,
    `Singapore ${stall.address_postal_code}`
  ].filter(part => part && part.trim() !== '' && part !== '#-').join(', ');

  return (
    <ScrollView style={styles.container}>
      {/* Stall Map Location */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={{
            latitude: stall.latitude,
            longitude: stall.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: stall.latitude,
              longitude: stall.longitude
            }}
            title={stall.name}
          />
        </MapView>
        <TouchableOpacity style={styles.directionsButton} onPress={openMaps}>
          <Ionicons name="navigate" size={20} color="white" />
          <Text style={styles.directionsButtonText}>Directions</Text>
        </TouchableOpacity>
      </View>

      {/* Stall Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.stallName}>{stall.name}</Text>
        
        {/* Cuisine Type Tag */}
        <View style={styles.cuisineContainer}>
          <View style={styles.cuisineTag}>
            <Text style={styles.cuisineText}>{stall.attributes?.cuisine_type || 'Local'}</Text>
          </View>
          <Text style={styles.priceRangeText}>
            {stall.attributes?.price_range ? `$${stall.attributes.price_range}` : ''}
          </Text>
        </View>
        
        <Text style={styles.description}>{stall.description}</Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="location" size={20} color="#666" style={styles.icon} />
          <Text style={styles.detailText}>{fullAddress}</Text>
        </View>

        {/* Attributes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Cuisine:</Text>
            <Text style={styles.attributeValue}>
              {stall.attributes?.cuisine_type || 'Not specified'}
            </Text>
          </View>
          
          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Price Range:</Text>
            <Text style={styles.attributeValue}>
              ${stall.attributes?.price_range || 'Not specified'}
            </Text>
          </View>
          
          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Dietary Options:</Text>
            <Text style={styles.attributeValue}>
              {stall.attributes?.dietary_requirements || 'Not specified'}
            </Text>
          </View>
          
          {stall.attributes?.avg_calorie_count > 0 && (
            <View style={styles.attributeRow}>
              <Text style={styles.attributeLabel}>Avg. Calorie Count:</Text>
              <Text style={styles.attributeValue}>
                {stall.attributes.avg_calorie_count} cal
              </Text>
            </View>
          )}
        </View>
        
        {/* HPB Certified Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HPB Certified Items</Text>
          
          <View style={styles.hpbItemsContainer}>
            {stall.attributes?.hpb_certified_items.split(',').map((item, index) => (
              <View key={index} style={styles.hpbItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.itemIcon} />
                <Text style={styles.hpbItemText}>{item.trim()}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.hpbReasonContainer}>
            <Text style={styles.hpbReasonTitle}>Why it's healthier:</Text>
            <Text style={styles.hpbReasonText}>
              {stall.attributes?.hpb_certification_reason || 'Meets HPB healthier dining guidelines'}
            </Text>
          </View>
        </View>
        
        {/* HPB Information */}
        <View style={styles.hpbInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" style={styles.icon} />
          <Text style={styles.hpbText}>
            This stall is approved by HPB's Healthier Dining Programme
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  mapContainer: {
    height: 200,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#2196F3',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionsButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  infoContainer: {
    padding: 15,
  },
  stallName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cuisineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cuisineTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  cuisineText: {
    fontSize: 14,
    color: '#1976D2',
  },
  priceRangeText: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  attributeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  attributeLabel: {
    width: 120,
    fontSize: 15,
    color: '#666',
  },
  attributeValue: {
    flex: 1,
    fontSize: 15,
  },
  hpbItemsContainer: {
    marginBottom: 15,
  },
  hpbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    marginRight: 8,
  },
  hpbItemText: {
    fontSize: 15,
  },
  hpbReasonContainer: {
    backgroundColor: '#F1F8E9',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
  },
  hpbReasonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2E7D32',
  },
  hpbReasonText: {
    fontSize: 14,
    color: '#33691E',
  },
  hpbInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 5,
    marginTop: 20,
  },
  hpbText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
  },
});