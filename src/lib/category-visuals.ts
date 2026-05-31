import Home from "@/app/page";
import {
  Briefcase,
  Building2,
  ChefHat,
  Clapperboard,
  Code2,
  DraftingCompass,
  GraduationCap,
  HardHat,
  HeartPulse,
  House,
  Landmark,
  Languages,
  Layers3,
  Leaf,
  type LucideIcon,
  Megaphone,
  PartyPopper,
  Plane,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Wrench,
} from "lucide-react";

export type CategoryVisual = {
  icon: LucideIcon;
  /** Tailwind classes for the icon tile (background + text). */
  tile: string;
};

type Rule = {
  /** Հայերեն բանալի բառեր՝ title-ի մեջ որոնելու համար (lowercase)։ */
  keywords: string[];
  icon: LucideIcon;
  tile: string;
};

const RULES: Rule[] = [
  {
    keywords: ["շինարար", "վերանորոգում"],
    icon: HardHat,
    tile: "bg-amber-100 text-amber-700",
  },
  {
    keywords: ["ճարտարապետ", "ինժեներ", "նախագծ"],
    icon: DraftingCompass,
    tile: "bg-orange-100 text-orange-700",
  },
  {
    keywords: ["տեխնոլոգիա", "ծրագրավորում"],
    icon: Code2,
    tile: "bg-sky-100 text-sky-700",
  },
  {
    keywords: ["դիզայն", "մարքեթինգ", "բովանդակ"],
    icon: Megaphone,
    tile: "bg-pink-100 text-pink-700",
  },
  {
    keywords: ["տուն և կենցաղ", "կենցաղ"],
    icon: House,
    tile: "bg-teal-100 text-teal-700",
  },
  {
    keywords: ["բիզնես", "ֆինանս", "կառավարում"],
    icon: Briefcase,
    tile: "bg-indigo-100 text-indigo-700",
  },
  {
    keywords: ["իրավական", "փաստաթղթ"],
    icon: Scale,
    tile: "bg-slate-200 text-slate-700",
  },
  {
    keywords: ["կրթություն", "խորհրդատվություն"],
    icon: GraduationCap,
    tile: "bg-blue-100 text-blue-700",
  },
  {
    keywords: ["առողջություն", "գեղեցկ", "խնամք"],
    icon: HeartPulse,
    tile: "bg-rose-100 text-rose-600",
  },
  {
    keywords: ["միջոցառում", "հյուրասիր"],
    icon: PartyPopper,
    tile: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    keywords: ["տրանսպորտ", "լոգիստիկա"],
    icon: Truck,
    tile: "bg-cyan-100 text-cyan-700",
  },
  {
    keywords: ["արտադրություն", "արհեստ"],
    icon: Wrench,
    tile: "bg-stone-200 text-stone-700",
  },
  {
    keywords: ["անշարժ գույք", "տարածք"],
    icon: Building2,
    tile: "bg-emerald-100 text-emerald-700",
  },
  {
    keywords: ["գյուղատնտեսություն", "կենդանի"],
    icon: Sprout,
    tile: "bg-lime-100 text-lime-700",
  },
  {
    keywords: ["տուրիզմ", "հյուրանոց", "ժամանց"],
    icon: Plane,
    tile: "bg-violet-100 text-violet-700",
  },
  {
    keywords: ["անվտանգություն", "վերահսկ"],
    icon: ShieldCheck,
    tile: "bg-red-100 text-red-700",
  },
  {
    keywords: ["մեդիա", "արվեստ", "ստեղծագործ"],
    icon: Clapperboard,
    tile: "bg-purple-100 text-purple-700",
  },
  {
    keywords: ["սնունդ", "ռեստորան", "խոհար"],
    icon: ChefHat,
    tile: "bg-yellow-100 text-yellow-700",
  },
  {
    keywords: ["թարգմանություն", "լեզու", "գրավոր"],
    icon: Languages,
    tile: "bg-green-100 text-green-700",
  },
  {
    keywords: ["պետական", "սոցիալական", "անձնական"],
    icon: Landmark,
    tile: "bg-zinc-200 text-zinc-700",
  },
  {
    keywords: ["էկոլոգիա", "էներգիա", "կայուն"],
    icon: Leaf,
    tile: "bg-emerald-100 text-emerald-700",
  },
];

const FALLBACK: CategoryVisual = {
  icon: Layers3,
  tile: "bg-amber-100 text-amber-800",
};

export function getCategoryVisual(title: string): CategoryVisual {
  const normalized = title.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return { icon: rule.icon, tile: rule.tile };
    }
  }
  return FALLBACK;
}
