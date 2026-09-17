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


const ROTA_BUILDINGS_LAYER_ID = 'rota-justice-buildings-3d';

function layerToken(layer: any) {
  return `${layer?.id || ''} ${layer?.['source-layer'] || ''}`.toLowerCase();
}

function hasAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function safeSetPaint(map: any, layerId: string, property: string, value: any) {
  try {
    map.setPaintProperty(layerId, property, value);
  } catch {
    // Estilos de terceiros podem não expor todas as propriedades esperadas.
  }
}

function safeSetLayout(map: any, layerId: string, property: string, value: any) {
  try {
    map.setLayoutProperty(layerId, property, value);
  } catch {
    // A personalização visual nunca deve impedir o mapa de carregar.
  }
}

export function applyRotaJusticeMapTheme(map: any) {
  if (!map?.getStyle) return;

  const style = map.getStyle();
  const layers = Array.isArray(style?.layers) ? style.layers : [];

  layers.forEach((layer: any) => {
    const id = layer.id;
    const token = layerToken(layer);

    if (!id) return;

    if (layer.type === 'background') {
      safeSetPaint(map, id, 'background-color', '#090c0e');
      safeSetPaint(map, id, 'background-opacity', 1);
      return;
    }

    if (layer.type === 'fill') {
      if (hasAny(token, ['water', 'ocean', 'river', 'lake'])) {
        safeSetPaint(map, id, 'fill-color', '#10262b');
        safeSetPaint(map, id, 'fill-opacity', 0.94);
      } else if (hasAny(token, ['park', 'wood', 'forest', 'grass', 'landcover', 'green'])) {
        safeSetPaint(map, id, 'fill-color', '#111c17');
        safeSetPaint(map, id, 'fill-opacity', 0.92);
      } else if (hasAny(token, ['building'])) {
        safeSetPaint(map, id, 'fill-color', '#1b1d1e');
        safeSetPaint(map, id, 'fill-outline-color', '#343027');
        safeSetPaint(map, id, 'fill-opacity', 0.9);
      } else if (hasAny(token, ['landuse', 'residential', 'commercial', 'industrial'])) {
        safeSetPaint(map, id, 'fill-color', '#101315');
        safeSetPaint(map, id, 'fill-opacity', 0.88);
      } else {
        safeSetPaint(map, id, 'fill-color', '#0f1214');
        safeSetPaint(map, id, 'fill-opacity', 0.82);
      }
      return;
    }

    if (layer.type === 'line') {
      if (hasAny(token, ['waterway', 'river', 'stream', 'canal'])) {
        safeSetPaint(map, id, 'line-color', '#1d3b41');
        safeSetPaint(map, id, 'line-opacity', 0.88);
      } else if (hasAny(token, ['motorway', 'trunk', 'primary', 'secondary'])) {
        safeSetPaint(map, id, 'line-color', '#6b5735');
        safeSetPaint(map, id, 'line-opacity', 0.92);
      } else if (hasAny(token, ['road', 'street', 'transportation', 'highway'])) {
        safeSetPaint(map, id, 'line-color', '#343638');
        safeSetPaint(map, id, 'line-opacity', 0.9);
      } else if (hasAny(token, ['rail'])) {
        safeSetPaint(map, id, 'line-color', '#564a36');
        safeSetPaint(map, id, 'line-opacity', 0.68);
      } else if (hasAny(token, ['boundary', 'admin'])) {
        safeSetPaint(map, id, 'line-color', '#4d4942');
        safeSetPaint(map, id, 'line-opacity', 0.52);
      } else {
        safeSetPaint(map, id, 'line-color', '#2a2d2f');
        safeSetPaint(map, id, 'line-opacity', 0.72);
      }
      return;
    }

    if (layer.type === 'symbol') {
      const isPlace = hasAny(token, ['place', 'city', 'town', 'village', 'state', 'country']);
      const isRoad = hasAny(token, ['road', 'street', 'highway', 'transportation']);

      safeSetPaint(map, id, 'text-color', isPlace ? '#d8c89e' : isRoad ? '#a28e69' : '#918d85');
      safeSetPaint(map, id, 'text-halo-color', '#090c0e');
      safeSetPaint(map, id, 'text-halo-width', isPlace ? 1.6 : 1.1);
      safeSetPaint(map, id, 'text-halo-blur', 0.8);
      safeSetPaint(map, id, 'icon-opacity', 0.72);

      if (isPlace) {
        safeSetPaint(map, id, 'text-opacity', 0.96);
      } else {
        safeSetPaint(map, id, 'text-opacity', 0.78);
      }

      return;
    }

    if (layer.type === 'raster') {
      safeSetPaint(map, id, 'raster-saturation', -0.82);
      safeSetPaint(map, id, 'raster-contrast', 0.24);
      safeSetPaint(map, id, 'raster-brightness-min', 0.05);
      safeSetPaint(map, id, 'raster-brightness-max', 0.48);
      return;
    }

    if (layer.type === 'hillshade') {
      safeSetPaint(map, id, 'hillshade-shadow-color', '#050708');
      safeSetPaint(map, id, 'hillshade-highlight-color', '#6c5b3b');
      safeSetPaint(map, id, 'hillshade-accent-color', '#2b2923');
      safeSetPaint(map, id, 'hillshade-exaggeration', 0.36);
    }
  });

  // Usa a mesma fonte vetorial da camada de prédios existente para criar
  // volume 2.5D sem depender de um segundo provedor de mapas.
  try {
    if (map.getLayer(ROTA_BUILDINGS_LAYER_ID)) {
      map.removeLayer(ROTA_BUILDINGS_LAYER_ID);
    }

    const buildingLayer = layers.find((layer: any) => (
      layer?.type === 'fill'
      && layer?.source
      && layer?.['source-layer']
      && hasAny(layerToken(layer), ['building'])
    ));

    if (buildingLayer) {
      const firstSymbolLayer = layers.find((layer: any) => layer?.type === 'symbol')?.id;

      map.addLayer(
        {
          id: ROTA_BUILDINGS_LAYER_ID,
          type: 'fill-extrusion',
          source: buildingLayer.source,
          'source-layer': buildingLayer['source-layer'],
          minzoom: 14,
          filter: buildingLayer.filter,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              '#17191a',
              16,
              '#2e291f',
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              3,
              16,
              18,
            ],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.82,
            'fill-extrusion-vertical-gradient': true,
          },
        },
        firstSymbolLayer,
      );
    }
  } catch {
    // O mapa continua funcional em estilos raster ou sem camada de prédios.
  }

  // Reduz POIs genéricos para os assets próprios do jogo terem prioridade visual.
  layers
    .filter((layer: any) => layer?.type === 'symbol' && hasAny(layerToken(layer), ['poi', 'amenity', 'shop']))
    .forEach((layer: any) => {
      safeSetPaint(map, layer.id, 'icon-opacity', 0.3);
      safeSetPaint(map, layer.id, 'text-opacity', 0.34);
    });

  try {
    map.setMaxPitch?.(65);
  } catch {
    // Compatibilidade com versões/estilos que não expõem esta opção.
  }
}
