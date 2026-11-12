import type { ProduceAddon } from "./types";

export function formatRupiah(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString("id-ID")}`;
}

export function splitPackageFeatures(features: string): string[] {
  if (!features) return [];
  return features
    .split(/\s*\+\s*|\s*,\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getCropImage(cropName: string): string {
  const lower = cropName.toLowerCase();
  if (lower.includes("tomat")) return "/images/cherry-tomato.jpg";
  if (lower.includes("bayam") || lower.includes("horenso")) return "/images/horenso.jpg";
  if (lower.includes("kale")) return "/images/kale-nero.jpg";
  return "/images/romaine.jpg";
}

export function formatCountdownFromDays(daysLeft: number, nowMs: number): {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
} {
  const safeDays = Math.max(0, Math.floor(daysLeft));
  if (safeDays === 0) {
    return { days: 0, hours: "00", minutes: "00", seconds: "00" };
  }
  const dayInSec = 86400;
  const elapsedTodaySec = Math.floor((nowMs / 1000) % dayInSec);
  const remainingTodaySec = dayInSec - elapsedTodaySec;
  const displayDays = Math.max(0, safeDays - 1);
  const h = Math.floor(remainingTodaySec / 3600);
  const m = Math.floor((remainingTodaySec % 3600) / 60);
  const s = remainingTodaySec % 60;
  return {
    days: displayDays,
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
  };
}

export const PRODUCE_ADDONS: ProduceAddon[] = [
  {
    id: "romaine-250",
    name: "Selada Romaine Organik",
    subtitle: "Renyah, bebas pestisida sintetis • INOFICE",
    badge: "Kadar Air 95%",
    unitLabel: "250g/pack",
    weightGrams: 250,
    price: 24000,
    image: "/images/romaine.jpg",
  },
  {
    id: "cherry-tomato-300",
    name: "Tomat Ceri Merah Ruby",
    subtitle: "Tingkat manis alami Brix 8.5+, kaya likopen",
    badge: "Brix 8.5+",
    unitLabel: "300g/box",
    weightGrams: 300,
    price: 32000,
    image: "/images/cherry-tomato.jpg",
  },
  {
    id: "bayam-brazil-300",
    name: "Bayam Brazil & Horenso Segar",
    subtitle: "Tekstur lembut manis, panen pagi jam 05.30",
    badge: "Siap Panen",
    unitLabel: "300g/ikat",
    weightGrams: 300,
    price: 28000,
    image: "/images/horenso.jpg",
  },
  {
    id: "kale-nero-200",
    name: "Kale Nero Organik Lacinato",
    subtitle: "Superfood padat zat besi & antioksidan",
    badge: "Kompos Bio",
    unitLabel: "200g/ikat",
    weightGrams: 200,
    price: 38000,
    image: "/images/kale-nero.jpg",
  },
];
