'use client';

import { useState, useEffect, useRef } from 'react';

interface UserCityData {
  city: string | null;
  displayCity: string;
  loading: boolean;
  error: string | null;
}

function normalizeCity(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function formatDisplayCity(city: string): string {
  return city === 'paris' ? 'Paris' : `À ${city.charAt(0).toUpperCase() + city.slice(1)}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.properties) return null;
    const city = feature.properties.city || feature.properties.municipality;
    return city ? normalizeCity(city) : null;
  } catch {
    return null;
  }
}

async function detectCityFromIP(): Promise<string | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const ipData = await response.json();
    const city = ipData.city || null;
    if (city && ipData.country_code === 'FR') {
      return normalizeCity(city);
    }
    return null;
  } catch {
    return null;
  }
}

export function useUserCity(): UserCityData {
  const [data, setData] = useState<UserCityData>({
    city: null,
    displayCity: 'en France',
    loading: true,
    error: null,
  });

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const cachedCity = typeof window !== 'undefined' ? localStorage.getItem('user-ip-city') : null;
    if (cachedCity) {
      const display = cachedCity === 'paris' ? 'Paris' : formatDisplayCity(cachedCity);
      setData({
        city: cachedCity,
        displayCity: cachedCity === 'paris' ? 'en France' : display,
        loading: false,
        error: null,
      });
    }

    const applyCity = (city: string) => {
      if (!isMounted.current) return;
      const validCity = (city || 'paris').trim() || 'paris';
      const display = validCity === 'paris' ? 'en France' : formatDisplayCity(validCity);
      localStorage.setItem('user-ip-city', validCity);
      setData({
        city: validCity,
        displayCity: display,
        loading: false,
        error: null,
      });
    };

    const setDefaultCity = () => {
      if (!isMounted.current) return;
      localStorage.setItem('user-ip-city', 'paris');
      setData({
        city: 'paris',
        displayCity: 'en France',
        loading: false,
        error: null,
      });
    };

    const runDetection = async () => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const ipCity = await detectCityFromIP();
        if (ipCity) applyCity(ipCity);
        else if (!cachedCity) setDefaultCity();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted.current) return;
          const { latitude, longitude } = position.coords;
          const city = await reverseGeocode(latitude, longitude);
          if (city) {
            applyCity(city);
          } else {
            const ipCity = await detectCityFromIP();
            if (ipCity) applyCity(ipCity);
            else if (!cachedCity) setDefaultCity();
          }
        },
        async () => {
          if (!isMounted.current) return;
          const ipCity = await detectCityFromIP();
          if (ipCity) applyCity(ipCity);
          else if (!cachedCity) setDefaultCity();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    };

    runDetection();

    return () => {
      isMounted.current = false;
    };
  }, []);

  return data;
}
