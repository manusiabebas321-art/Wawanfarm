import { Suspense } from "react";
import { PaketCheckoutClient } from "@/components/PaketCheckoutClient";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { PackageItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PaketPage() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("packages")
    .select("*")
    .order("price", { ascending: true });

  const packages = (data ?? []) as PackageItem[];

  return (
    <Suspense
      fallback={
        <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant">
          Memuat paket WawanFarm...
        </div>
      }
    >
      <PaketCheckoutClient packages={packages} />
    </Suspense>
  );
}
