// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import HomeScreen from './screens/HomeScreen';
import StallDetailScreen from './screens/StallDetailScreen';
import FilterScreen from './screens/FilterScreen';

// Create the navigation stack
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'HPB Food Finder' }} 
        />
        <Stack.Screen 
          name="StallDetail" 
          component={StallDetailScreen} 
          options={({ route }) => ({ title: route.params.stallName })} 
        />
        <Stack.Screen 
          name="Filter" 
          component={FilterScreen} 
          options={{ title: 'Filter Options' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}