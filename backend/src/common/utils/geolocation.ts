// src/common/utils/geolocation.ts

/**
 * Utilidades de geolocalizacion para el Sistema VIDA
 * Incluye calculo de distancias usando la formula Haversine
 */

// Radio de la Tierra en kilometros
const EARTH_RADIUS_KM = 6371;

/**
 * Convierte grados a radianes
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcula la distancia entre dos puntos geograficos usando la formula Haversine
 * @param lat1 Latitud del punto 1
 * @param lon1 Longitud del punto 1
 * @param lat2 Latitud del punto 2
 * @param lon2 Longitud del punto 2
 * @returns Distancia en kilometros
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Verifica si unas coordenadas estan dentro de Mexico
 * Bounding box aproximado de Mexico
 */
export function isWithinMexico(lat: number, lon: number): boolean {
  const MEXICO_BOUNDS = {
    minLat: 14.5,
    maxLat: 32.7,
    minLon: -118.4,
    maxLon: -86.7,
  };

  return (
    lat >= MEXICO_BOUNDS.minLat &&
    lat <= MEXICO_BOUNDS.maxLat &&
    lon >= MEXICO_BOUNDS.minLon &&
    lon <= MEXICO_BOUNDS.maxLon
  );
}

/**
 * Valida que las coordenadas sean validas
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Formatea las coordenadas para mostrar al usuario
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
}

/**
 * Genera URL de Google Maps para las coordenadas
 */
export function getGoogleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

/**
 * Genera URL de Google Maps con direcciones desde una ubicacion
 */
export function getGoogleMapsDirectionsUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): string {
  return `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`;
}
