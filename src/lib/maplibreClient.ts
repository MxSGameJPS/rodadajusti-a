const MAPLIBRE_VERSION = '6.7.0';
const MAPLIBRE_MODULE_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
const MAPLIBRE_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

const DEFAULT_OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const MAP_STYLE_URL = ((import.meta as any).env?.VITE_MAP_STYLE_URL as string | undefined)
  || DEFAULT_OPENFREEMAP_STYLE_URL;
const OSM_TILE_URL = ((import.meta as any).env?.VITE_OSM_TILE_URL as string | undefined) || '';

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
  // Para o MVP, o estilo vetorial do OpenFreeMap usa dados do OpenStreetMap,
  // funciona com MapLibre e não exige chave de API. Isso evita depender
  // diretamente do servidor público de tiles raster do OSM em cada tela.
  // Quem preferir outro provedor pode definir VITE_MAP_STYLE_URL.
  if (!OSM_TILE_URL) return MAP_STYLE_URL;

  // Compatibilidade opcional: se VITE_OSM_TILE_URL for informado, mantém o
  // modo raster anterior. Útil para self-hosting futuro ou testes locais.
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [OSM_TILE_URL || DEFAULT_OSM_TILE_URL],
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
