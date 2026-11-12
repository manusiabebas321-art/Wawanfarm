import https from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { formatRupiah } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ChatSuggestedOrder, CropIot, PackageItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRIMARY_MODEL = "gemini-3.8-flash";
const MODEL_CANDIDATES = [
  PRIMARY_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
] as const;

interface InteractionResponseStep {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
}

interface InteractionRestResponse {
  id?: string;
  status?: string;
  model?: string;
  steps?: InteractionResponseStep[];
  error?: { message?: string; code?: string };
}

function extractOutputText(data: InteractionRestResponse): string {
  const steps = data.steps ?? [];
  const texts: string[] = [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.type === "model_output" && Array.isArray(step.content)) {
      for (const part of step.content) {
        if (part.type === "text" && typeof part.text === "string") {
          texts.push(part.text);
        }
      }
      if (texts.length > 0) break;
    }
  }
  return texts.join("").trim();
}

function createInteractionOverIpv4(
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs = 15000
): Promise<{ status: number; data: InteractionRestResponse }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const req = https.request(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        family: 4,
        timeout: timeoutMs,
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Api-Revision": "2026-05-20",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw) as InteractionRestResponse;
            resolve({ status: res.statusCode ?? 500, data: parsed });
          } catch {
            reject(
              new Error(`Respons Gemini tidak valid (HTTP ${res.statusCode}).`)
            );
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout menghubungi Google Gemini."));
    });
    req.write(bodyStr);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      previousInteractionId?: string;
      previousModel?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const userMessage = (body.message ?? "").trim();
    if (!userMessage) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum dikonfigurasi di .env.local." },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();
    const [{ data: cropsData, error: cropsErr }, { data: pkgData, error: pkgErr }] =
      await Promise.all([
        supabase.from("crops_iot").select("*").order("id", { ascending: true }),
        supabase.from("packages").select("*").order("price", { ascending: true }),
      ]);

    if (cropsErr || pkgErr) {
      return NextResponse.json(
        {
          error: "Gagal membaca data terbaru dari Supabase.",
          details: cropsErr?.message || pkgErr?.message,
        },
        { status: 502 }
      );
    }

    const crops = (cropsData ?? []) as CropIot[];
    const packages = (pkgData ?? []) as PackageItem[];

    const cropsSummary = crops
      .map(
        (c) =>
          `- [ID ${c.id}] ${c.crop_name} (${c.bed_location}) | Kelembapan Tanah: ${c.soil_moisture}% | Suhu: ${c.temperature}°C | Pupuk Organik: ${c.organic_fertilizer} (terakhir ${c.last_fertilized}) | Hitung Mundur Panen: ${c.harvest_days_left} hari | Status: ${c.status}`
      )
      .join("\n");

    const packagesSummary = packages
      .map(
        (p) =>
          `- [Paket ID ${p.id}] ${p.package_name} (${p.period}) — ${formatRupiah(p.price)} | Fitur: ${p.features}`
      )
      .join("\n");

    const recentHistoryText =
      Array.isArray(body.history) && body.history.length > 0
        ? `\nRiwayat percakapan sebelumnya:\n${body.history
            .slice(-6)
            .map(
              (m) =>
                `${m.role === "user" ? "Konsumen" : "WawanAI"}: ${m.content}`
            )
            .join("\n")}\n`
        : "";

    const systemInstruction = `Kamu adalah WawanAI, asisten agronomi & layanan konsumen pintar untuk WawanFarm Smart Agri-CRM.
Jawablah selalu dalam Bahasa Indonesia yang ramah, ringkas, informatif, dan membantu pemesanan.
Gunakan HANYA data real-time terbaru berikut dari database Supabase WawanFarm (jangan mengarang angka atau paket yang tidak ada):

DATA SENSOR KEBUN IOT TERBARU (tabel crops_iot):
${cropsSummary || "Belum ada data sensor kebun."}

DATA PAKET LANGGANAN TERBARU (tabel packages):
${packagesSummary || "Belum ada data paket."}

ATURAN PENTING:
1. Jika konsumen bertanya kondisi tanaman, kelembapan tanah, suhu, pupuk organik, atau kapan panen, sebutkan angka pasti dari tabel crops_iot di atas.
2. Jika konsumen ingin memesan, minta rekomendasi paket, atau menanyakan harga, rekomendasikan paket yang paling sesuai dari tabel packages di atas dan jelaskan cara checkout.
3. Setiap kali kamu merekomendasikan satu paket spesifik untuk dipesan, akhiri jawabanmu di baris terakhir dengan tag persis berformat:
[[PAKET_REKOMENDASI:<ID_PAKET>]]
(contoh: [[PAKET_REKOMENDASI:2]]). Jangan tampilkan tag ini jika tidak merekomendasikan pemesanan paket tertentu.`;

    let selectedInteraction: InteractionRestResponse | null = null;
    let usedModel: string = PRIMARY_MODEL;
    let lastErrMessage = "Gagal memanggil Google Gemini API.";

    for (const candidate of MODEL_CANDIDATES) {
      try {
        const canReuseInteraction =
          Boolean(body.previousInteractionId) &&
          (!body.previousModel || candidate === body.previousModel);
        const promptInput =
          !canReuseInteraction && recentHistoryText
            ? `${recentHistoryText}\nPertanyaan konsumen terbaru: ${userMessage}`
            : userMessage;

        const res = await createInteractionOverIpv4(apiKey, {
          model: candidate,
          input: promptInput,
          system_instruction: systemInstruction,
          ...(canReuseInteraction
            ? { previous_interaction_id: body.previousInteractionId }
            : {}),
          generation_config: {
            thinking_level: "low",
          },
        });

        if (res.status >= 200 && res.status < 300) {
          selectedInteraction = res.data;
          usedModel = candidate;
          break;
        }

        lastErrMessage =
          res.data?.error?.message || `HTTP ${res.status} dari Gemini API.`;
        const retryable = res.status === 429 || res.status === 503;
        if (!retryable) break;
      } catch (err) {
        lastErrMessage =
          err instanceof Error ? err.message : "Koneksi ke Gemini gagal.";
      }
    }

    if (!selectedInteraction) {
      return NextResponse.json(
        {
          error: "Gagal memanggil Google Gemini API.",
          details: lastErrMessage,
        },
        { status: 502 }
      );
    }

    const rawText =
      extractOutputText(selectedInteraction) ||
      "Maaf, saya sedang memproses data kebun. Silakan coba lagi sebentar.";

    let cleanReply = rawText;
    let suggestedOrder: ChatSuggestedOrder | null = null;

    const match = rawText.match(/\[\[PAKET_REKOMENDASI:(\d+)\]\]/);
    if (match) {
      const pkgId = Number(match[1]);
      cleanReply = rawText
        .replace(/\[\[PAKET_REKOMENDASI:\d+\]\]/g, "")
        .trim();
      const matchedPkg = packages.find((p) => p.id === pkgId);
      if (matchedPkg) {
        suggestedOrder = {
          packageId: matchedPkg.id,
          packageName: matchedPkg.package_name,
          period: matchedPkg.period,
          price: matchedPkg.price,
          reason: matchedPkg.features,
        };
      }
    }

    return NextResponse.json({
      reply: cleanReply,
      interactionId: selectedInteraction.id ?? null,
      model: usedModel,
      suggestedOrder,
      snapshot: {
        cropsCount: crops.length,
        packagesCount: packages.length,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat menghubungi Google Gemini.";
    return NextResponse.json(
      {
        error: "Gagal memanggil Google Gemini API.",
        details: message,
      },
      { status: 502 }
    );
  }
}
