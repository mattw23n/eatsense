// components/StallListView.js with budget display
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

  // Function to render price range in a user-friendly format
  const renderPriceRange = (priceRange) => {
    if (!priceRange || priceRange === 'Unknown') {
      return (
        <View style={styles.priceRangeContainer}>
          <Text style={styles.priceText}>Price: Unknown</Text>
        </View>
      );
    }

    // For ranges like "5-10"
    if (priceRange.includes('-')) {
      return (
        <View style={styles.priceRangeContainer}>
          <Text style={styles.priceText}>Budget: ${priceRange}</Text>
        </View>
      );
    }
    
    // For prices like "30+"
    if (priceRange.includes('+')) {
      return (
        <View style={styles.priceRangeContainer}>
          <Text style={styles.priceText}>Budget: ${priceRange}</Text>
        </View>
      );
    }
    
    // Default case
    return (
      <View style={styles.priceRangeContainer}>
        <Text style={styles.priceText}>Budget: ${priceRange}</Text>
      </View>
    );
  };

  // Render a price indicator with dollar signs
  const renderPriceIndicator = (priceRange) => {
    if (!priceRange || priceRange === 'Unknown') {
      return null;
    }

    // Extract the average price from the range
    let avgPrice = 0;
    
    if (priceRange.includes('-')) {
      const [min, max] = priceRange.split('-').map(num => parseInt(num, 10));
      avgPrice = (min + max) / 2;
    } else if (priceRange.includes('+')) {
      avgPrice = parseInt(priceRange.replace('+', ''), 10);
    } else {
      avgPrice = parseInt(priceRange, 10);
    }
    
    // Determine dollar sign level
    let dollarSigns = '';
    if (avgPrice < 5) {
      dollarSigns = '$';
    } else if (avgPrice < 15) {
      dollarSigns = '$$';
    } else if (avgPrice < 25) {
      dollarSigns = '$$$';
    } else {
      dollarSigns = '$$$$';
    }
    
    return <Text style={styles.dollarSigns}>{dollarSigns}</Text>;
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
            <View style={styles.nameContainer}>
              <Text style={styles.stallName} numberOfLines={1}>{item.name}</Text>
              {renderPriceIndicator(item.attributes?.price_range)}
            </View>
            
            <View style={styles.cuisineRow}>
              {item.attributes?.cuisine_type && item.attributes.cuisine_type !== 'Unknown' && (
                <View style={styles.cuisineTag}>
                  <Text style={styles.cuisineText}>
                    {item.attributes.cuisine_type}
                  </Text>
                </View>
              )}
              
              {renderPriceRange(item.attributes?.price_range)}
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
              
              {item.attributes?.dietary_requirements && item.attributes.dietary_requirements !== 'Unknown' && (
                <View style={styles.dietaryContainer}>
                  <Ionicons name="leaf-outline" size={14} color="#4CAF50" style={styles.dietaryIcon} />
                  <Text style={styles.dietaryText} numberOfLines={1}>
                    {item.attributes.dietary_requirements.split(',')[0].trim()}
                    {item.attributes.dietary_requirements.includes(',') ? '...' : ''}
                  </Text>
                </View>
              )}
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  stallName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 5,
  },
  dollarSigns: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
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
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 10,
  },
  dietaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  dietaryIcon: {
    marginRight: 3,
  },
  dietaryText: {
    fontSize: 12,
    color: '#4CAF50',
    maxWidth: 100,
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