// Shared per-region zoom memory for our Leaflet surfaces (BuilderMap,
// RealLeafletMap). Holds the last camera (center + zoom) per region key
// and persists to localStorage so a full page refresh restores the same
// view. Each surface namespaces its own storage key.
//
// See mem://preferences/builder-map-zoom — switching regions restores
// that region's last view; never auto-reset on switch.

export interface RememberedCamera {
  center: [number, number];
  zoom: number;
}

const stores = new Map<string, Map<string, RememberedCamera>>();

function storageKey(namespace: string) {
  return `yes.mapZoom.${namespace}.v1`;
}

function hydrate(namespace: string): Map<string, RememberedCamera> {
  const map = new Map<string, RememberedCamera>();
  if (typeof window === "undefined") return map;
  try {
    const raw = window.localStorage.getItem(storageKey(namespace));
    if (!raw) return map;
    const parsed = JSON.parse(raw) as Record<string, RememberedCamera>;
    for (const [k, v] of Object.entries(parsed ?? {})) {
      if (
        v &&
        Array.isArray(v.center) &&
        v.center.length === 2 &&
        Number.isFinite(v.center[0]) &&
        Number.isFinite(v.center[1]) &&
        Number.isFinite(v.zoom)
      ) {
        map.set(k, { center: [v.center[0], v.center[1]], zoom: v.zoom });
      }
    }
  } catch {
    /* corrupt JSON — ignore and start fresh */
  }
  return map;
}

function persist(namespace: string, store: Map<string, RememberedCamera>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, RememberedCamera> = {};
    for (const [k, v] of store) obj[k] = v;
    window.localStorage.setItem(storageKey(namespace), JSON.stringify(obj));
  } catch {
    /* quota / privacy mode — in-memory store still works */
  }
}

export function getMapZoomStore(namespace: string) {
  let store = stores.get(namespace);
  if (!store) {
    store = hydrate(namespace);
    stores.set(namespace, store);
  }
  return {
    get(regionKey: string): RememberedCamera | undefined {
      return store!.get(regionKey);
    },
    set(regionKey: string, camera: RememberedCamera) {
      store!.set(regionKey, camera);
      persist(namespace, store!);
    },
  };
}
