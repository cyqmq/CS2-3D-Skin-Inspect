import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { WeaponSkin } from "../lib/api";
import { getTexturePaths } from "../lib/textures";
import { gradientStyle } from "../gradients";

const MODEL_MAP: Record<string, [string, string]> = {
  ak47: ["ak47", "weapon_rif_ak47"], aug: ["aug", "weapon_rif_aug"],
  awp: ["awp", "weapon_snip_awp"], bizon: ["bizon", "weapon_smg_bizon"],
  c4: ["c4", "weapon_c4"], cz75a: ["cz75a", "weapon_pist_cz75a"],
  deagle: ["deagle", "weapon_pist_deagle"], decoy: ["decoy", "weapon_decoy"],
  elite: ["elite", "weapon_pist_elite"], famas: ["famas", "weapon_rif_famas"],
  fiveseven: ["fiveseven", "weapon_pist_fiveseven"], flashbang: ["flashbang", "weapon_flashbang"],
  g3sg1: ["g3sg1", "weapon_snip_g3sg1"], galilar: ["galilar", "weapon_rif_galilar"],
  glock18: ["glock18", "weapon_pist_glock18"], healthshot: ["healthshot", "weapon_healthshot"],
  hegrenade: ["hegrenade", "weapon_hegrenade"], hkp2000: ["hkp2000", "weapon_pist_hkp2000"],
  incendiary: ["incendiary", "weapon_incendiarygrenade"], m249: ["m249", "weapon_mach_m249"],
  m4a1_silencer: ["m4a1_silencer", "weapon_rif_m4a1_silencer"], m4a4: ["m4a4", "weapon_rif_m4a4"],
  mac10: ["mac10", "weapon_smg_mac10"], mag7: ["mag7", "weapon_shot_mag7"],
  molotov: ["molotov", "weapon_molotov"], mp5sd: ["mp5sd", "weapon_smg_mp5sd"],
  mp7: ["mp7", "weapon_smg_mp7"], mp9: ["mp9", "weapon_smg_mp9"],
  negev: ["negev", "weapon_mach_negev"], nova: ["nova", "weapon_shot_nova"],
  p250: ["p250", "weapon_pist_p250"], p90: ["p90", "weapon_smg_p90"],
  revolver: ["revolver", "weapon_pist_revolver"], sawedoff: ["sawedoff", "weapon_shot_sawedoff"],
  scar20: ["scar20", "weapon_snip_scar20"], sg556: ["sg556", "weapon_rif_sg556"],
  smokegrenade: ["smokegrenade", "weapon_smokegrenade"], ssg08: ["ssg08", "weapon_snip_ssg08"],
  taser: ["taser", "weapon_pist_taser"], tec9: ["tec9", "weapon_pist_tec9"],
  ump45: ["ump45", "weapon_smg_ump45"], usp_silencer: ["usp_silencer", "weapon_pist_usp_silencer"],
  xm1014: ["xm1014", "weapon_shot_xm1014"],
  knife_bayonet: ["knife_bayonet", "weapon_knife_bayonet"], knife_bowie: ["knife_bowie", "weapon_knife_bowie"],
  knife_butterfly: ["knife_butterfly", "weapon_knife_butterfly"], knife_canis: ["knife_canis", "weapon_knife_canis"],
  knife_cord: ["knife_cord", "weapon_knife_cord"], knife_css: ["knife_css", "weapon_knife_css"],
  knife_default_ct: ["knife_default_ct", "weapon_knife_default_ct"], knife_default_t: ["knife_default_t", "weapon_knife_default_t"],
  knife_falchion: ["knife_falchion", "weapon_knife_falchion"], knife_flip: ["knife_flip", "weapon_knife_flip"],
  knife_gut: ["knife_gut", "weapon_knife_gut"], knife_karambit: ["knife_karambit", "weapon_knife_karambit"],
  knife_kukri: ["knife_kukri", "weapon_knife_kukri"], knife_m9: ["knife_m9", "weapon_knife_m9"],
  knife_navaja: ["knife_navaja", "weapon_knife_navaja"], knife_outdoor: ["knife_outdoor", "weapon_knife_outdoor"],
  knife_push: ["knife_push", "weapon_knife_push"], knife_skeleton: ["knife_skeleton", "weapon_knife_skeleton"],
  knife_stiletto: ["knife_stiletto", "weapon_knife_stiletto"], knife_tactical: ["knife_tactical", "weapon_knife_tactical"],
  knife_talon: ["knife_talon", "weapon_knife_talon"], knife_ursus: ["knife_ursus", "weapon_knife_ursus"],
  defuser: ["defuser", "weapon_defuser"],
};

function weaponToModelId(wid: string) { return wid.replace(/^weapon_/, ""); }

function getModelPath(wid: string) {
  const mid = weaponToModelId(wid);
  const info = MODEL_MAP[mid];
  if (!info) return `/models/ak47/weapon_rif_ak47.gltf`;
  return `/models/${info[0]}/${info[1]}.gltf`;
}

function WeaponModel({ skin, albedoTex, maskTex, normalTex }: {
  skin: WeaponSkin;
  albedoTex: THREE.Texture | null;
  maskTex: THREE.Texture | null;
  normalTex: THREE.Texture | null;
}) {
  const ref = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const rotX = useRef(0);
  const rotY = useRef(0);

  useEffect(() => {
    const el = document.querySelector("canvas");
    if (!el) return;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current || !ref.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      rotY.current += dx * 0.01;
      rotX.current += dy * 0.01;
      ref.current.rotation.set(rotX.current, rotY.current, 0);
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { isDragging.current = false; };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const url = getModelPath(skin.weapon.id);
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    // Remove eholster nodes and unused model version (legacy or HD)
    const isLegacy = (skin as any).legacy_model === true;
    const removeNames = ["eholster", isLegacy ? "body_hd" : "body_legacy"];
    const toRemove: THREE.Object3D[] = [];
    c.traverse((child) => {
      if (removeNames.some((n) => child.name.toLowerCase().includes(n))) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => obj.parent?.remove(obj));

    // Find the largest mesh (main weapon body) and center on it
    let bestCenter: THREE.Vector3 | null = null;
    let bestVolume = 0;
    c.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.computeBoundingBox();
      const bb = child.geometry.boundingBox;
      if (!bb) return;
      const sz = new THREE.Vector3();
      bb.getSize(sz);
      const vol = sz.x * sz.y * sz.z;
      if (vol > bestVolume) {
        bestVolume = vol;
        bestCenter = new THREE.Vector3();
        bb.getCenter(bestCenter);
      }
    });

    if (bestCenter) {
      c.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry = child.geometry.clone();
        child.geometry.translate(-bestCenter!.x, -bestCenter!.y, -bestCenter!.z);
      });
    }

    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.color.set("#aaaaaa");
            mat.roughness = 0.6;
            mat.metalness = 0.15;
          } else if (mat instanceof THREE.MeshPhongMaterial) {
            mat.color.set("#aaaaaa");
          }
        }
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    if (!albedoTex && !maskTex && !normalTex) return;
    cloned.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const matName = ((child.material as any)?.name ?? "").toLowerCase();
      if (matName.includes("scope") || matName.includes("bare_arm")) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (albedoTex && "map" in mat) {
          (mat as any).map = albedoTex;
          mat.needsUpdate = true;
        }
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (albedoTex) {
            mat.color.set("#ffffff");
            mat.roughness = 0.5;
            mat.metalness = 0.1;
          }
          if (normalTex) {
            mat.normalMap = normalTex;
            mat.normalMapType = THREE.TangentSpaceNormalMap;
            mat.normalScale.set(1, 1);
            mat.needsUpdate = true;
          }
        } else if (mat instanceof THREE.MeshPhongMaterial && albedoTex) {
          mat.color.set("#ffffff");
        }
      }
    });
  }, [cloned, albedoTex, maskTex, normalTex]);

  return <primitive ref={ref} object={cloned} />;
}

interface Weapon3DViewerProps { skin: WeaponSkin }

export function Weapon3DViewer({ skin }: Weapon3DViewerProps) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [maskTex, setMaskTex] = useState<THREE.Texture | null>(null);
  const [normalTex, setNormalTex] = useState<THREE.Texture | null>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [wear, setWear] = useState(0);

  const wearLabel = wear < 0.07 ? "FN" : wear < 0.15 ? "MW" : wear < 0.38 ? "FT" : wear < 0.45 ? "WW" : "BS";

  const loadTex = (path: string): Promise<THREE.Texture> => new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(path,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.flipY = false; resolve(t); },
      undefined, reject
    );
  });

  useEffect(() => {
    setTex(null); setMaskTex(null); setNormalTex(null); setShowPlaceholder(true);
    const paintIndex = parseInt(skin.paint_index);
    if (isNaN(paintIndex)) return;

    getTexturePaths(paintIndex).then((paths) => {
      if (!paths) return;
      setShowPlaceholder(false);
      loadTex(paths.albedo).then(setTex).catch(() => {});
      if (paths.materialMask) loadTex(paths.materialMask).then(setMaskTex).catch(() => {});
      if (paths.normal) loadTex(paths.normal).then(setNormalTex).catch(() => {});
    });
  }, [skin.paint_index]);

  return (
      <div className="absolute inset-0" style={{ background: gradientStyle("pinkBlush") }}>
      <Canvas camera={{ position: [1.2, 0.5, 1.5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 3, 3]} intensity={3.0} />
        <directionalLight position={[-2, 1, -2]} intensity={1.5} />
        <directionalLight position={[0, -1, 0]} intensity={0.6} />
        <hemisphereLight args={["#ffffff", "#111122", 0.5]} />
        <pointLight position={[0, 2, 0]} intensity={0.5} />
        <Suspense fallback={null}>
          <WeaponModel skin={skin} albedoTex={tex} maskTex={maskTex} normalTex={normalTex} />
        </Suspense>
        <OrbitControls
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minDistance={0.3}
          maxDistance={4}
          enableDamping
          dampingFactor={0.1}
          target={[0, 0, 0]}
        />
      </Canvas>
      <div className="absolute bottom-4 left-4 pointer-events-none bg-black/50 backdrop-blur rounded-lg px-3 py-2">
        <div className="text-sm font-medium text-white/95">{skin.name}</div>
        <div className="text-xs mt-0.5" style={{ color: skin.rarity.color }}>{skin.rarity.name}</div>
        {skin.min_float != null && (
          <div className="text-[10px] text-white/40 mt-0.5">
            Float: {skin.min_float} – {skin.max_float}
          </div>
        )}
        {showPlaceholder && (
          <div className="text-[10px] text-yellow-400/80 mt-0.5">Texture not in library</div>
        )}
      </div>
      <div className="absolute bottom-4 right-4 pointer-events-auto flex items-center gap-2 bg-black/50 backdrop-blur rounded-lg px-3 py-2">
        <span className="text-[10px] text-white/50">{wearLabel}</span>
        <input
          type="range" min={0} max={1} step={0.01} value={wear}
          onChange={(e) => setWear(parseFloat(e.target.value))}
          className="w-20 h-1 accent-white/60"
        />
        <span className="text-[10px] text-white/50 w-8 text-right">{wear.toFixed(2)}</span>
      </div>
    </div>
  );
}
