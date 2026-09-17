let activeWorldMap: any | null = null;

export function registerActiveWorldMap(map: any) {
  activeWorldMap = map;
}

export function unregisterActiveWorldMap(map: any) {
  if (activeWorldMap === map) activeWorldMap = null;
}

export function getActiveWorldMap() {
  return activeWorldMap;
}
