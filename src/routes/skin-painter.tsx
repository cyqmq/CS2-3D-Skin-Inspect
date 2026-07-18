import { useState, useEffect } from "react";
import { loadSkinsData, getRarityColor } from "../lib/api";
import { Weapon3DViewer } from "../components/weapon-3d-viewer";
import { gradientStyle } from "../gradients";

interface WeaponInfo {
  id: string;
  name: string;
  skins: { paintkit_id: number; name: string; rarity_name: string }[];
}

const CATEGORY_MAP: Record<string, string> = {
  glock: "Pistols", hkp2000: "Pistols", usp_silencer: "Pistols", elite: "Pistols",
  p250: "Pistols", cz75a: "Pistols", fiveseven: "Pistols", tec9: "Pistols",
  deagle: "Pistols", revolver: "Pistols",
  nova: "Shotguns", xm1014: "Shotguns", mag7: "Shotguns", sawedoff: "Shotguns",
  mac10: "SMGs", mp9: "SMGs", mp7: "SMGs", mp5sd: "SMGs", ump45: "SMGs", p90: "SMGs", bizon: "SMGs",
  galilar: "Rifles", ak47: "Rifles", m4a1_silencer: "Rifles", sg556: "Rifles", famas: "Rifles", aug: "Rifles",
  awp: "Sniper Rifles", ssg08: "Sniper Rifles", g3sg1: "Sniper Rifles", scar20: "Sniper Rifles",
  negev: "Heavy", m249: "Heavy",
};

const CATEGORY_ORDER = ["Pistols", "SMGs", "Shotguns", "Rifles", "Sniper Rifles", "Heavy"];

export default function SkinPainter() {
  const [categorized, setCategorized] = useState<Record<string, WeaponInfo[]>>({});
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponInfo | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<{ paintkit_id: number; name: string; rarity_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSkinsData().then((data) => {
      const map: Record<string, WeaponInfo[]> = {};
      for (const w of data.weapons) {
        if (w.id === "unknown") continue;
        const cat = CATEGORY_MAP[w.id] || "Other";
        if (!map[cat]) map[cat] = [];
        map[cat].push({ id: w.id, name: w.name || w.id, skins: w.skins.map((s) => ({ paintkit_id: s.paintkit_id, name: s.name, rarity_name: s.rarity_name })) });
      }
      for (const cat of Object.keys(map)) map[cat].sort((a, b) => a.name.localeCompare(b.name));
      setCategorized(map);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-white/50">Loading skins data...</div>;
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-white/10 overflow-y-auto">
        <div className="p-3 text-sm text-white/40 uppercase tracking-wider">Weapons</div>
        {CATEGORY_ORDER.map((cat) => (
          <div key={cat}>
            <div className="px-3 py-1.5 text-xs text-white/25 uppercase">{cat}</div>
            {(categorized[cat] || []).map((w) => (
              <button
                key={w.id}
                onClick={() => { setSelectedWeapon(w); setSelectedSkin(null); }}
                className={`w-full text-left px-4 py-1.5 text-sm truncate transition-colors ${
                  selectedWeapon?.id === w.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <section className="flex-1 relative bg-[#0a0a10] overflow-hidden" style={{ background: gradientStyle("pinkBlush") }}>
        {selectedSkin ? (
          <Weapon3DViewer weaponId={selectedWeapon!.id} paintkitId={selectedSkin.paintkit_id} skinName={selectedSkin.name} rarityName={selectedSkin.rarity_name} />
        ) : selectedWeapon ? (
          <div className="flex items-center justify-center h-full text-white/30">Select a skin from the right panel</div>
        ) : (
          <div className="flex items-center justify-center h-full text-white/30">Select a weapon from the left panel</div>
        )}
      </section>

      <aside className="w-64 shrink-0 border-l border-white/10 overflow-y-auto">
        {selectedWeapon ? (
          <>
            <div className="p-3 text-sm text-white/40 uppercase tracking-wider sticky top-0 bg-black/80 backdrop-blur flex items-center justify-between">
              <span>{selectedWeapon.name} Skins</span>
              <button
                type="button"
                onClick={() => {
                  const text = selectedSkin?.name || "none";
                  const ta = document.createElement("textarea");
                  ta.value = text; ta.style.cssText = "position:fixed;left:-9999px";
                  document.body.appendChild(ta); ta.select();
                  document.execCommand("copy"); ta.remove();
                  setCopied(true); setTimeout(() => setCopied(false), 1500);
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/50 cursor-pointer"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            {selectedWeapon.skins.map((s) => (
              <button
                key={s.paintkit_id}
                onClick={() => setSelectedSkin(s)}
                className={`w-full text-left px-3 py-2 transition-colors ${
                  selectedSkin?.paintkit_id === s.paintkit_id ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="text-xs truncate text-white/70">{s.name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: getRarityColor(s.rarity_name) }}>{s.rarity_name}</div>
              </button>
            ))}
          </>
        ) : (
          <div className="p-6 text-sm text-white/30 text-center">← Pick a weapon first</div>
        )}
      </aside>
    </div>
  );
}
