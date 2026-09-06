const MAPLIBRE_VERSION = '6.7.0';
const MAPLIBRE_MODULE_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
const MAPLIBRE_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

const DEFAULT_OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_TILE_URL = ((import.meta as any).env?.VITE_OSM_TILE_URL as string | undefined) || DEFAULT_OSM_TILE_URL;

let mapLibrePromise: Promise<any> | null = null;

function ensureStylesheet() {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector<HTMLLinkElement>('link[data-rota-maplibre="true"]');
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPLIBRE_CSS_URL;
  link.dataset.rotaMaplibre = 'true';
  document.head.appendChild(link);
}

export async function loadMapLibre() {
  ensureStylesheet();
  if (!mapLibrePromise) {
    mapLibrePromise = import(/* @vite-ignore */ MAPLIBRE_MODULE_URL);
  }
  return mapLibrePromise;
}

export function buildOpenStreetMapStyle() {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [OSM_TILE_URL],
        tileSize: 256,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      {
        id: 'osm-base',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

export const MAPLIBRE_RUNTIME_VERSION = MAPLIBRE_VERSION;
