// Convert Web Mercator (EPSG:3857) x,y in meters to WGS84 lat/lon
export function mercatorToLatLon(x: number, y: number): { lat: number; lon: number } {
  const R = 20037508.34;
  const lon = (x / R) * 180;
  let lat = (y / R) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lon };
}
