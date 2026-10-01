import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.ink,
        tabBarInactiveTintColor: Colors.onSurfaceMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(251, 249, 243, 0.98)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0, 0, 0, 0.06)',
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...Shadows.card,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconActiveContainer]}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
                color={focused ? Colors.onPrimary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconActiveContainer]}>
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={20}
                color={focused ? Colors.onPrimary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconActiveContainer]}>
              <Ionicons
                name={focused ? 'trail-sign' : 'trail-sign-outline'}
                size={20}
                color={focused ? Colors.onPrimary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rental"
        options={{
          title: 'Rental',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconActiveContainer]}>
              <Ionicons
                name={focused ? 'basket' : 'basket-outline'}
                size={20}
                color={focused ? Colors.onPrimary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconActiveContainer]}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={20}
                color={focused ? Colors.onPrimary : color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 38,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveContainer: {
    backgroundColor: Colors.primary, // #9fe870 signature lime active indicator
  },
});
