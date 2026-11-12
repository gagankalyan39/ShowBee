'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { theatreAPI } from '@/lib/api';

export interface CityCoords {
  name: string;
  lat: number;
  lng: number;
}

// Known coordinates for cinema multiplex hubs
export const SUPPORTED_CITIES: CityCoords[] = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
];

// Haversine formula to compute geodesic distance in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

interface LocationContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  cities: string[];
  isLocating: boolean;
  gpsCoords: { lat: number; lng: number } | null;
  detectedCity: string | null;
  locationStatus: string | null;
  detectLocation: () => Promise<string | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<string>('Bengaluru');
  const [cities, setCities] = useState<string[]>(['Bengaluru', 'Hyderabad', 'Chennai']);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Initialize from localStorage or fallback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCity = localStorage.getItem('showbee_city');
      if (savedCity) {
        setSelectedCityState(savedCity);
      }
    }
  }, []);

  // Fetch cities from backend
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await theatreAPI.getCities();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // Merge backend cities with any extra supported cities
          const merged = Array.from(new Set([...res.data, 'Bengaluru', 'Hyderabad', 'Chennai']));
          setCities(merged);
        }
      } catch (err) {
        console.warn('Using default cities fallback:', err);
      }
    }
    loadCities();
  }, []);

  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    if (typeof window !== 'undefined') {
      localStorage.setItem('showbee_city', city);
    }
    setLocationStatus(`Location set to ${city}`);
    // Clear message after 4s
    setTimeout(() => setLocationStatus(null), 4000);
  };

  const detectLocation = async (): Promise<string | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      setTimeout(() => setLocationStatus(null), 4000);
      return null;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring satellite GPS position...');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGpsCoords({ lat: latitude, lng: longitude });

          // Find nearest supported cinema city
          let nearestCity = 'Bengaluru';
          let minDistance = Infinity;

          for (const city of SUPPORTED_CITIES) {
            const dist = calculateDistanceKm(latitude, longitude, city.lat, city.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestCity = city.name;
            }
          }

          // If the nearest city isn't in backend yet, map to closest active theatre hub
          const activeHubs = ['Bengaluru', 'Hyderabad', 'Chennai'];
          let finalCity = nearestCity;
          if (!activeHubs.includes(nearestCity)) {
            // Find closest among activeHubs
            let minActiveDist = Infinity;
            for (const hubName of activeHubs) {
              const hub = SUPPORTED_CITIES.find((c) => c.name === hubName);
              if (hub) {
                const dist = calculateDistanceKm(latitude, longitude, hub.lat, hub.lng);
                if (dist < minActiveDist) {
                  minActiveDist = dist;
                  finalCity = hubName;
                }
              }
            }
          }

          setSelectedCityState(finalCity);
          setDetectedCity(finalCity);
          if (typeof window !== 'undefined') {
            localStorage.setItem('showbee_city', finalCity);
          }

          setIsLocating(false);
          const msg = `📍 GPS Located: Matched to ${finalCity} (${minDistance} km away). Updated cinema theatres!`;
          setLocationStatus(msg);
          setTimeout(() => setLocationStatus(null), 5000);

          resolve(finalCity);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setIsLocating(false);
          let errText = 'Could not access GPS. Please choose city manually.';
          if (error.code === error.PERMISSION_DENIED) {
            errText = 'Location permission denied. Please allow access or select city.';
          } else if (error.code === error.TIMEOUT) {
            errText = 'Location request timed out. Retaining ' + selectedCity;
          }
          setLocationStatus(errText);
          setTimeout(() => setLocationStatus(null), 4000);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  };

  return (
    <LocationContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        cities,
        isLocating,
        gpsCoords,
        detectedCity,
        locationStatus,
        detectLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
