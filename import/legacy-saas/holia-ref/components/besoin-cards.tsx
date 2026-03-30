'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { useUserCity } from "@/hooks/use-user-city";
import { ArrowRight } from "lucide-react";
import useSWR from 'swr';



// Import des icônes Lucide-react
import {
  Brain,
  Moon,
  Heart,
  Apple, // Remplacement de Stomach qui n'existe pas
  Activity,
  Baby,
  Users,
  User,
  Shield,
  Sparkles
} from "lucide-react";

// Map des icônes par nom
const iconMap = {
  Brain,
  Moon,
  Heart,
  Stomach: Apple, // Mapping vers Apple pour les problèmes digestifs
  Activity,
  Baby,
  Users,
  User,
  Shield,
  Sparkles
};

interface BesoinCardsProps {
  className?: string;
}

export function BesoinCards({ className }: BesoinCardsProps) {
  const { city, displayCity, loading: cityLoading } = useUserCity();

  // État pour stocker les sujets
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Géocoder la ville pour obtenir les coordonnées
  const geocodeCity = async (cityName: string): Promise<{ lat: number; lng: number; name: string } | null> => {
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cityName)}&type=municipality&limit=1`
      );
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.features || data.features.length === 0) {
        // Essayer sans filtre
        const response2 = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cityName)}&limit=1`
        );
        if (!response2.ok) return null;
        const data2 = await response2.json();
        if (!data2.features || data2.features.length === 0) return null;
        const feature = data2.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        const name = feature.properties.city || feature.properties.name;
        return { lat, lng, name };
      }
      
      const feature = data.features[0];
      const [lng, lat] = feature.geometry.coordinates;
      const name = feature.properties.city || feature.properties.name;
      return { lat, lng, name };
    } catch (error) {
      return null;
    }
  };

  // Construire la clé SWR pour le cache
  const getCountsKey = () => {
    if (!city || city === 'paris') {
      return '/api/subjects/counts?city=Paris';
    }
    return null; // Sera défini après géocodage
  };

  // Géocoder la ville et construire l'URL pour les counts
  const [countsUrl, setCountsUrl] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    if (!cityLoading && city) {
      if (city === 'paris') {
        setCountsUrl('/api/subjects/counts?city=Paris');
        setCityName('Paris');
      } else {
        geocodeCity(city).then((coords) => {
          if (coords) {
            setCountsUrl(`/api/subjects/counts?latitude=${coords.lat}&longitude=${coords.lng}&radius=30&city=${encodeURIComponent(coords.name)}`);
            setCityName(coords.name);
          } else {
            // Fallback sur mode national (France) si pas de coordonnées
            setCountsUrl('/api/subjects/counts');
            setCityName(null);
          }
        });
      }
    } else if (!cityLoading && !city) {
      // Mode national (France) si pas de ville détectée ou effacée
      setCountsUrl('/api/subjects/counts');
      setCityName(null);
    }
  }, [city, cityLoading]);

  // Fetch des counts avec SWR - revalidation immédiate quand la ville change (countsUrl)
  const { data: countsData, error: countsError } = useSWR(
    countsUrl,
    (url) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0, // Pas de deduping : chaque changement de ville = nouvelle requête immédiate
    }
  );

  // Charger les sujets
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await fetch('/api/subjects');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des sujets');
        }
        const data = await response.json();
        setSubjects(data.subjects || []);
        setDataLoaded(true);
      } catch (error) {
        console.error("Erreur lors du chargement des sujets:", error);
        setDataLoaded(true);
      }
    };
    loadSubjects();
  }, []);

  // Fonction pour obtenir l'icône Lucide-react
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent || Brain; // Fallback vers Brain si l'icône n'existe pas
  };

  // Afficher un état de chargement si les données ne sont pas encore chargées
  if (!dataLoaded) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 justify-items-center ${className}`}>
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="animate-pulse w-full h-full rounded-3xl">
            <CardContent className="p-6 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                <div className="w-20 h-4 bg-gray-200 rounded mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const defaultCity = city || 'paris';
  
  // Construire les counts avec les informations de localisation
  const subjectCountsMap: Record<string, { count: number; inCity: number; inRadius: number }> = {};
  if (countsData?.success && countsData.counts) {
    countsData.counts.forEach((item: any) => {
      subjectCountsMap[item.slug] = {
        count: item.count || 0,
        inCity: item.inCity || 0,
        inRadius: item.inRadius || 0,
      };
    });
  }

  // Afficher tous les sujets, mais griser ceux avec 0 praticiens
  // Trier pour mettre ceux avec praticiens en premier
  const allSubjects = dataLoaded ? subjects : subjects.slice(0, 10);
  
  // Trier les sujets : ceux avec praticiens en premier, puis ceux sans
  const sortedSubjects = [...allSubjects].sort((a, b) => {
    const countsA = subjectCountsMap[a.slug] || { count: 0 };
    const countsB = subjectCountsMap[b.slug] || { count: 0 };
    return countsB.count - countsA.count; // Décroissant : plus de praticiens en premier
  });

  // Obtenir le nom de la ville à utiliser pour remplacer [City]
  const getCityNameForReplacement = () => {
    if (cityName) return cityName;
    if (displayCity && displayCity !== '[City]' && displayCity !== 'en France') {
      // Enlever le préfixe "À " si présent
      return displayCity.replace(/^À /, '');
    }
    // Si pas de ville, retourner null pour indiquer le mode national
    return null;
  };

  const cityNameForReplacement = getCityNameForReplacement();

  return (
    <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 justify-items-center items-stretch ${className}`}>
      {sortedSubjects.map((subject) => {
        const IconComponent = getIcon(subject.icon);
        const counts = subjectCountsMap[subject.slug] || { count: 0, inCity: 0, inRadius: 0 };
        const hasPractitioners = counts.count > 0;
        
        // Déterminer le texte à afficher
        let locationText = '';
        if (hasPractitioners) {
          if (cityNameForReplacement && counts.inCity > 0) {
            // Afficher uniquement le nombre de praticiens dans la ville exacte
            locationText = `${counts.inCity} praticien${counts.inCity > 1 ? 's' : ''} à ${cityNameForReplacement}`;
          } else if (cityNameForReplacement && counts.inRadius > 0) {
            // Afficher le nombre total dans le rayon (proximité)
            locationText = `${counts.count} praticien${counts.count > 1 ? 's' : ''} à proximité`;
          } else if (!cityNameForReplacement) {
            // Mode national : afficher le nombre total en France
            locationText = `${counts.count} praticien${counts.count > 1 ? 's' : ''} en France`;
          } else {
            locationText = `${counts.count} praticien${counts.count > 1 ? 's' : ''}`;
          }
        } else {
          locationText = 'Aucun praticien disponible';
        }
        
        // Remplacer [City] dans la description si elle existe
        const description = subject.metaDescription 
          ? subject.metaDescription.replace(/\[City\]/g, cityNameForReplacement || 'votre ville')
          : null;

        // Contenu de la carte (avec ou sans lien)
        const cardContent = (
          <Card className={`
            transition-all duration-300 ease-out
            border border-sable/60 relative overflow-hidden rounded-3xl
            h-full flex flex-col
            ${hasPractitioners 
              ? 'group hover:shadow-xl hover:shadow-[#9bb49b]/10 hover:-translate-y-1 hover:scale-[1.02]' 
              : 'opacity-50 grayscale cursor-not-allowed'
            }
          `}>
            {/* Hover bar 85% largeur, centrée, n’empiète pas sur les coins arrondis */}
            {hasPractitioners && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-1 rounded-full bg-sauge scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-10 origin-center" />
            )}

            <CardContent className="p-5 h-full flex flex-col justify-between flex-1">
              <div className="flex-1 flex flex-col">
                <div className={`flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-colors ${
                  hasPractitioners 
                    ? 'bg-[#9bb49b]/10 group-hover:bg-[#9bb49b]/20' 
                    : 'bg-gray-200'
                }`}>
                  <IconComponent className={`h-7 w-7 ${hasPractitioners ? 'text-[#9bb49b]' : 'text-gray-400'}`} strokeWidth={1.5} />
                </div>

                <h3 className={`font-semibold mb-2 text-base md:text-lg leading-tight ${
                  hasPractitioners ? 'text-anthracite' : 'text-gray-500'
                }`}>
                  {subject.name}
                </h3>

                {description && (
                  <p className={`text-sm leading-relaxed flex-1 ${
                    hasPractitioners ? 'text-anthracite/70' : 'text-gray-400'
                  }`}>
                    {description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 flex-shrink-0">
                <div className={`text-xs font-medium ${
                  hasPractitioners ? 'text-[#9bb49b]/70' : 'text-gray-400'
                }`}>
                  {locationText}
                </div>

                {hasPractitioners && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4 text-[#9bb49b]" strokeWidth={2} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

        // Si pas de praticiens, retourner la carte sans lien
        if (!hasPractitioners) {
          return (
            <div key={subject.slug} className="w-full h-full">
              {cardContent}
            </div>
          );
        }

        // Sinon, retourner avec le lien
        return (
          <Link
            key={subject.slug}
            href={`/sujet/${subject.slug}/${defaultCity}`}
            className="group block w-full h-full"
          >
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}