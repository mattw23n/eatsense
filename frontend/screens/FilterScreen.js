// FilterScreen.js with walking time estimates
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

export default function FilterScreen({ route, navigation }) {
  const { currentFilters, onFilterChange } = route.params;
  
  // Setup state with current filters
  const [cuisineType, setCuisineType] = useState(currentFilters.cuisine_type);
  const [priceRange, setPriceRange] = useState(currentFilters.price_range);
  const [dietary, setDietary] = useState(currentFilters.dietary);
  const [radius, setRadius] = useState(currentFilters.radius || 2);
  
  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({
    cuisine_types: [],
    price_ranges: [],
    dietary_requirements: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch filter options when component mounts
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch available filter options from API
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/filters`);
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      const data = await response.json();
      
      // Add "All" options
      const options = {
        cuisine_types: ['All', ...data.cuisine_types],
        price_ranges: ['All', ...data.price_ranges],
        dietary_requirements: ['All', ...data.dietary_requirements]
      };
      
      setFilterOptions(options);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated walking time based on radius
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

  // Apply filters and navigate back
  const applyFilters = () => {
    const newFilters = {
      cuisine_type: cuisineType === 'All' ? null : cuisineType,
      price_range: priceRange === 'All' ? null : priceRange,
      dietary: dietary === 'All' ? null : dietary,
      radius: radius
    };
    
    onFilterChange(newFilters);
    navigation.goBack();
  };

  // Reset all filters
  const resetFilters = () => {
    setCuisineType('All');
    setPriceRange('All');
    setDietary('All');
    setRadius(2);
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading filter options...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFilterOptions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Search Radius Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Radius</Text>
          <View style={styles.radiusInfoContainer}>
            <View style={styles.radiusValueContainer}>
              <Text style={styles.radiusValue}>{radius.toFixed(1)} km</Text>
              <Text style={styles.walkingTime}>
                ≈ {getEstimatedWalkingTime(radius)} walking time
              </Text>
            </View>
            <View style={styles.radiusIconContainer}>
              <Ionicons name="walk" size={20} color="#666" />
            </View>
          </View>
          
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={5}
            step={0.5}
            value={radius}
            onValueChange={setRadius}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#2196F3"
          />
          
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0.5 km</Text>
            <Text style={styles.sliderLabel}>5 km</Text>
          </View>
          
          <View style={styles.walkingTimeHints}>
            <Text style={styles.walkingTimeHint}>
              {getEstimatedWalkingTime(0.5)}
            </Text>
            <Text style={styles.walkingTimeHint}>
              {getEstimatedWalkingTime(5)}
            </Text>
          </View>
        </View>
        
        {/* Cuisine Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuisine Type</Text>
          <View style={styles.optionList}>
            {filterOptions.cuisine_types.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  cuisineType === type && styles.selectedOption
                ]}
                onPress={() => setCuisineType(type)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    cuisineType === type && styles.selectedOptionText
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Price Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.optionList}>
            {filterOptions.price_ranges.map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.optionButton,
                  priceRange === range && styles.selectedOption
                ]}
                onPress={() => setPriceRange(range)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    priceRange === range && styles.selectedOptionText
                  ]}
                >
                  ${range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Dietary Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Requirements</Text>
          <View style={styles.optionList}>
            {filterOptions.dietary_requirements.map((requirement) => (
              <TouchableOpacity
                key={requirement}
                style={[
                  styles.optionButton,
                  dietary === requirement && styles.selectedOption
                ]}
                onPress={() => setDietary(requirement)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    dietary === requirement && styles.selectedOptionText
                  ]}
                >
                  {requirement}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetFilters}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={applyFilters}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 15,
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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  radiusInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  radiusValueContainer: {
    flex: 1,
  },
  radiusValue: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  walkingTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  radiusIconContainer: {
    paddingHorizontal: 10,
  },
  slider: {
    height: 40,
    marginBottom: 5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  walkingTimeHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  walkingTimeHint: {
    fontSize: 11,
    color: '#888',
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 14,
  },
  selectedOptionText: {
    color: 'white',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
  },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
  },
});