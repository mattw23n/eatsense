// components/StallListView.js
import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StallListView({ stalls, onStallPress }) {
  // Function to determine if a stall is open
  // Note: In a real app, you would compare against current time
  // and actual opening hours from your database
  const isOpen = () => {
    const now = new Date();
    const hour = now.getHours();
    // Assume most food stalls open 8am-9pm
    return hour >= 8 && hour < 21;
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="restaurant-outline" size={60} color="#ccc" />
      <Text style={styles.emptyText}>No stalls found nearby</Text>
      <Text style={styles.emptySubtext}>
        Try adjusting your filters or increasing your search radius
      </Text>
    </View>
  );

  // Render an individual stall item
  const renderStallItem = ({ item }) => {
    // Build a simplified address
    const address = item.address_building 
      ? `${item.address_building}, #${item.address_floor}-${item.address_unit}` 
      : `${item.address_street}`;
    
    // Determine if stall is open
    const open = isOpen();
    
    return (
      <TouchableOpacity 
        style={styles.stallItem}
        onPress={() => onStallPress(item)}
      >
        <View style={styles.stallContent}>
          <View style={styles.stallInfo}>
            <Text style={styles.stallName}>{item.name}</Text>
            
            <View style={styles.cuisineRow}>
              {item.attributes?.cuisine_type && item.attributes.cuisine_type !== 'Unknown' && (
                <View style={styles.cuisineTag}>
                  <Text style={styles.cuisineText}>
                    {item.attributes.cuisine_type}
                  </Text>
                </View>
              )}
              
              {item.attributes?.price_range && item.attributes.price_range !== 'Unknown' && (
                <Text style={styles.priceText}>
                  {item.attributes.price_range}
                </Text>
              )}
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#666" style={styles.icon} />
              <Text style={styles.detailText} numberOfLines={1}>{address}</Text>
            </View>
            
            {item.distance && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={16} color="#666" style={styles.icon} />
                <Text style={styles.detailText}>{item.distance.toFixed(1)} km away</Text>
              </View>
            )}
            
            <View style={styles.statusRow}>
              <View style={[styles.statusIndicator, open ? styles.openIndicator : styles.closedIndicator]} />
              <Text style={styles.statusText}>{open ? 'Open' : 'Closed'}</Text>
            </View>
          </View>
          
          <View style={styles.hpbBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={stalls}
      renderItem={renderStallItem}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmpty}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 15,
    paddingBottom: 20,
    flexGrow: 1,
  },
  stallItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  stallContent: {
    flexDirection: 'row',
    padding: 15,
  },
  stallInfo: {
    flex: 1,
  },
  stallName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cuisineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cuisineTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  cuisineText: {
    fontSize: 12,
    color: '#1976D2',
  },
  priceText: {
    fontSize: 12,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  openIndicator: {
    backgroundColor: '#4CAF50',
  },
  closedIndicator: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  hpbBadge: {
    justifyContent: 'flex-start',
    paddingLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 40,
  },
});