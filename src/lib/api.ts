const SKINS_URL = "/skindata/data/skins.json";

const RARITY_COLORS: Record<string, string> = {
  "Consumer Grade": "#b0c3d9", "Industrial Grade": "#5e98d9",
  "Mil-Spec Grade": "#4b69ff", "Restricted": "#8847ff",
  "Classified": "#d32ce6", "Covert": "#eb4b4b",
};

interface SkinEntry {
  paintkit_id: number;
  paintkit_name: string;
  name: string;
  style: string;
  rarity: string;
  rarity_name: string;
  texture_path: string;
  vmat_path: string;
}

interface WeaponEntry {
  id: string;
  name: string;
  model_path: string;
  skins: SkinEntry[];
}

interface SkinsData {
  weapons: WeaponEntry[];
  total_skins: number;
}

let skinsData: SkinsData | null = null;

export async function loadSkinsData(): Promise<SkinsData> {
  if (skinsData) return skinsData;
  const resp = await fetch(SKINS_URL);
  skinsData = await resp.json();
  return skinsData!;
}

export function getSkinTexture(weaponId: string, paintkitId: number): { albedo: string; vmat: string } | null {
  if (!skinsData) return null;
  const w = skinsData.weapons.find((w) => w.id === weaponId);
  if (!w) return null;
  const s = w.skins.find((s) => s.paintkit_id === paintkitId);
  if (!s) return null;
  return {
    albedo: `/skindata/${s.texture_path}`,
    vmat: `/skindata/${s.vmat_path}`,
  };
}

export function getModelPath(weaponId: string): string | null {
  if (!skinsData) return null;
  const w = skinsData.weapons.find((w) => w.id === weaponId);
  if (!w) return null;
  return `/skindata/${w.model_path}`;
}

export function getRarityColor(rarityName: string): string {
  return RARITY_COLORS[rarityName] ?? "#888";
}

export { skinsData };
