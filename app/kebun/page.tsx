import { LiveCropsIotGrid } from "@/components/LiveCropsIotGrid";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { CropIot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KebunPage() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("crops_iot")
    .select("*")
    .order("id", { ascending: true });

  const initialCrops = (data ?? []) as CropIot[];

  return <LiveCropsIotGrid initialCrops={initialCrops} />;
}
