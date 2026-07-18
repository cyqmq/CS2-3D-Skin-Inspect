import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getSkinTexture, getRarityColor, loadSkinsData } from "../lib/api";

const MODEL_ALIASES: Record<string, string> = {
  m4a1: "m4a1_silencer", glock: "glock18", p2000: "hkp2000",
};

const VPK_MODELS: Record<string, string> = {
  ak47: "ak47/weapon_rif_ak47", aug: "aug/weapon_rif_aug", awp: "awp/weapon_snip_awp",
  bizon: "bizon/weapon_smg_bizon", cz75a: "cz75a/weapon_pist_cz75a",
  deagle: "deagle/weapon_pist_deagle", elite: "elite/weapon_pist_elite",
  famas: "famas/weapon_rif_famas", fiveseven: "fiveseven/weapon_pist_fiveseven",
  g3sg1: "g3sg1/weapon_snip_g3sg1", galilar: "galilar/weapon_rif_galilar",
  glock18: "glock18/weapon_pist_glock18", hkp2000: "hkp2000/weapon_pist_hkp2000",
  m249: "m249/weapon_mach_m249", m4a1_silencer: "m4a1_silencer/weapon_rif_m4a1_silencer",
  mac10: "mac10/weapon_smg_mac10", mp5sd: "mp5sd/weapon_smg_mp5sd",
  mp7: "mp7/weapon_smg_mp7", mp9: "mp9/weapon_smg_mp9", negev: "negev/weapon_mach_negev",
  nova: "nova/weapon_shot_nova", p250: "p250/weapon_pist_p250", p90: "p90/weapon_smg_p90",
  revolver: "revolver/weapon_pist_revolver", sawedoff: "sawedoff/weapon_shot_sawedoff",
  scar20: "scar20/weapon_snip_scar20", sg556: "sg556/weapon_rif_sg556",
  ssg08: "ssg08/weapon_snip_ssg08", tec9: "tec9/weapon_pist_tec9",
  ump45: "ump45/weapon_smg_ump45", usp_silencer: "usp_silencer/weapon_pist_usp_silencer",
  xm1014: "xm1014/weapon_shot_xm1014",
};

function resolveModelUrl(weaponId: string): string {
  let mid = weaponId;
  mid = MODEL_ALIASES[mid] || mid;
  const vpk = VPK_MODELS[mid];
  if (vpk) return `/assets/vpk_models/weapons/models/${vpk}.glb`;
  return `/assets/vpk_models/weapons/models/ak47/weapon_rif_ak47.glb`;
}

function WeaponModel({ weaponId, albedoTex, wear }: {
  weaponId: string; albedoTex: THREE.Texture | null; wear: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const rotX = useRef(0), rotY = useRef(0);

  useEffect(() => {
    const el = document.querySelector("canvas");
    if (!el) return;
    const onDown = (e: PointerEvent) => { if (e.button !== 0) return; isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
    const onMove = (e: PointerEvent) => { if (!isDragging.current || !ref.current) return; rotY.current += (e.clientX - lastPos.current.x) * 0.01; rotX.current += (e.clientY - lastPos.current.y) * 0.01; ref.current.rotation.set(rotX.current, rotY.current, 0); lastPos.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging.current = false; };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { el.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, []);

  const url = resolveModelUrl(weaponId);
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    function findByName(s: string) { let r: THREE.Object3D | undefined; c.traverse((ch) => { if (!r && ch.name.includes(s)) r = ch; }); return r; }
    findByName("eholster")?.parent?.remove(findByName("eholster")!);
    const l = findByName("body_legacy"), h = findByName("body_hd");
    if (l && h) { (h.parent ?? l.parent)?.remove(h); } // keep legacy, remove HD for classic skins
    // Center
    let bestCenter: THREE.Vector3 | null = null; let bestVol = 0;
    c.traverse((ch) => {
      if (!(ch instanceof THREE.Mesh)) return; ch.geometry.computeBoundingBox(); const bb = ch.geometry.boundingBox; if (!bb) return;
      const sz = new THREE.Vector3(); bb.getSize(sz); const vol = sz.x * sz.y * sz.z;
      if (vol > bestVol) { bestVol = vol; bestCenter = new THREE.Vector3(); bb.getCenter(bestCenter); }
    });
    if (bestCenter) c.traverse((ch) => { if (ch instanceof THREE.Mesh) { ch.geometry = ch.geometry.clone(); ch.geometry.translate(-bestCenter!.x, -bestCenter!.y, -bestCenter!.z); } });
    // Default materials
    c.traverse((ch) => {
      if (!(ch instanceof THREE.Mesh)) return;
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      for (const m of mats) {
        const hasTex = "map" in m && (m as any).map;
        if (m instanceof THREE.MeshStandardMaterial && !hasTex) { m.color.set("#666666"); m.roughness = 0.8; m.metalness = 0.1; }
        else if (m instanceof THREE.MeshPhongMaterial && !hasTex) m.color.set("#666666");
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    cloned.traverse((ch) => {
      if (!(ch instanceof THREE.Mesh)) return;
      const mn = ((ch.material as any)?.name ?? "").toLowerCase();
      if (mn.includes("scope") || mn.includes("bare_arm")) return;
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      for (const m of mats) {
        if (!(m instanceof THREE.MeshStandardMaterial)) continue;
        if (albedoTex) { m.map = albedoTex; m.color.set("#ffffff"); }
        m.roughness = 0.5 + Math.max(0, Math.min(1, wear)) * 0.4;
        m.metalness = 0.05;
        m.needsUpdate = true;
      }
    });
  }, [cloned, albedoTex, wear]);

  return <primitive ref={ref} object={cloned} />;
}

interface Weapon3DViewerProps {
  weaponId: string;
  paintkitId: number;
  skinName: string;
  rarityName: string;
}

export function Weapon3DViewer({ weaponId, paintkitId, skinName, rarityName }: Weapon3DViewerProps) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [wear, setWear] = useState(0);
  const wearLabel = wear < 0.07 ? "FN" : wear < 0.15 ? "MW" : wear < 0.38 ? "FT" : wear < 0.45 ? "WW" : "BS";

  const loadTex = (path: string): Promise<THREE.Texture> => new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(path,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.flipY = false; resolve(t); },
      undefined, reject
    );
  });

  useEffect(() => {
    setTex(null);
    loadSkinsData().then(() => {
      const ti = getSkinTexture(weaponId, paintkitId);
      if (!ti) return;
      loadTex(ti.albedo).then(setTex).catch(() => {});
    });
  }, [weaponId, paintkitId]);

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [1.2, 0.5, 1.5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} />
        <directionalLight position={[-2, 1, -2]} intensity={0.6} />
        <directionalLight position={[0, -1, 0]} intensity={0.3} />
        <Suspense fallback={null}>
          <WeaponModel weaponId={weaponId} albedoTex={tex} wear={wear} />
        </Suspense>
        <OrbitControls enableRotate={false} enablePan={true} enableZoom={true} minDistance={0.3} maxDistance={4} enableDamping dampingFactor={0.1} target={[0, 0, 0]} />
      </Canvas>
      <div className="absolute bottom-4 left-4 pointer-events-none bg-black/50 backdrop-blur rounded-lg px-3 py-2 z-10">
        <div className="text-sm font-medium text-white/95">{skinName}</div>
        <div className="text-xs mt-0.5" style={{ color: getRarityColor(rarityName) }}>{rarityName}</div>
      </div>
      <div className="absolute bottom-4 right-4 pointer-events-auto flex items-center gap-2 bg-black/50 backdrop-blur rounded-lg px-3 py-2">
        <span className="text-[10px] text-white/50">{wearLabel}</span>
        <input type="range" min={0} max={1} step={0.01} value={wear} onChange={(e) => setWear(parseFloat(e.target.value))} className="w-20 h-1 accent-white/60" />
        <span className="text-[10px] text-white/50 w-8 text-right">{wear.toFixed(2)}</span>
      </div>
    </div>
  );
}
