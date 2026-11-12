"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { formatRupiah, splitPackageFeatures } from "@/lib/format";
import type { PackageItem } from "@/lib/types";

interface PackageCardsProps {
  packages: PackageItem[];
  onSelectPackage?: (pkg: PackageItem) => void;
  selectedPackageId?: number | null;
}

export function PackageCards({
  packages,
  onSelectPackage,
  selectedPackageId,
}: PackageCardsProps) {
  const router = useRouter();
  const { selectPackage, selectedPackage } = useAuth();

  const activeId = selectedPackageId ?? selectedPackage?.id ?? null;

  const handleChoose = (pkg: PackageItem) => {
    selectPackage(pkg);
    if (onSelectPackage) {
      onSelectPackage(pkg);
    } else {
      router.push(`/paket?packageId=${pkg.id}`);
    }
  };

  if (packages.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center text-on-surface-variant">
        <span className="material-symbols-outlined text-3xl text-primary mb-2 block">
          inventory_2
        </span>
        <p className="font-semibold text-on-surface">
          Belum ada paket tersedia di tabel Supabase.
        </p>
        <p className="text-sm mt-1">
          Tambahkan data ke tabel <code>packages</code> untuk menampilkannya di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
      {packages.map((pkg, index) => {
        const isPopular =
          pkg.period.toLowerCase().includes("bulan") ||
          (packages.length >= 3 && index === 1);
        const isSelected = activeId === pkg.id;
        const features = splitPackageFeatures(pkg.features);
        const iconName = pkg.period.toLowerCase().includes("bulan")
          ? "stars"
          : pkg.period.toLowerCase().includes("2")
            ? "diversity_1"
            : "energy_savings_leaf";

        return (
          <article
            key={pkg.id}
            className={`relative rounded-3xl p-5 md:p-6 flex flex-col justify-between gap-4 overflow-hidden transition-all duration-300 ${
              isPopular
                ? "glass-card-elevated ring-1 ring-primary/20"
                : "glass-card"
            } ${isSelected ? "ring-2 ring-primary shadow-xl" : ""}`}
          >
            {isPopular && (
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-fixed via-primary to-secondary-container" />
            )}

            <div className="flex flex-col gap-4">
              {isPopular ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider shadow-sm inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">
                      stars
                    </span>
                    Paling Populer
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary text-[11px] font-bold uppercase">
                    <span className="material-symbols-outlined text-[15px]">
                      verified
                    </span>
                    Rekomendasi Ahli
                  </span>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Periode {pkg.period}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      {iconName}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-[19px] font-bold text-on-surface leading-snug">
                  {pkg.package_name}
                </h3>
                <p className="text-[13px] text-on-surface-variant mt-0.5">
                  Siklus panen {pkg.period.toLowerCase()} langsung dari kebun
                  organik pintar
                </p>
              </div>

              <div className="flex items-baseline gap-1.5 py-1">
                <span
                  className={`font-bold text-primary tabular-nums ${
                    isPopular ? "text-[30px] leading-tight" : "text-[26px]"
                  }`}
                >
                  {formatRupiah(pkg.price)}
                </span>
                <span className="text-[13px] text-on-surface-variant">
                  / {pkg.period.toLowerCase()}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span className="text-[13px] text-on-surface leading-snug">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleChoose(pkg)}
              className={`w-full rounded-full font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                isPopular
                  ? "h-13 bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg shadow-primary/25 hover:opacity-95"
                  : isSelected
                    ? "h-12 bg-primary text-on-primary shadow-md"
                    : "h-12 bg-surface-container-high text-on-secondary-container hover:bg-secondary-container"
              }`}
            >
              <span>
                {isSelected
                  ? "Paket Dipilih • Lanjut Checkout"
                  : `Pilih ${pkg.package_name}`}
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {isSelected ? "check_circle" : "arrow_forward"}
              </span>
            </button>
          </article>
        );
      })}
    </div>
  );
}
