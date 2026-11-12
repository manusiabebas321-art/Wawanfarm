# WawanFarm Smart Agri-CRM

Aplikasi web responsif (Mobile-First untuk Smartphone, Tablet, dan Desktop) yang dibangun dari desain **WawanFarm Smart Agri-CRM** pada Stitch menggunakan **Next.js (App Router)**, **Tailwind CSS**, **Supabase** (Auth, Database, Realtime), dan **Google Gemini (`@google/genai`)**.

## Fitur Utama

1. **Desain Lintas Perangkat (Luminous Agri-Glass)**
   - **Smartphone (`< 768px`)**: Tata letak asli Stitch Mobile dengan warna Emerald Green (`#006948`), kartu frosted glassmorphism ala iOS, dan **Floating Bottom Navigation Bar**.
   - **Tablet (`768px – 1023px`)**: Grid otomatis melebar menjadi **2 kolom**.
   - **Desktop (`>= 1024px`)**: **Sidebar Kiri** persisten + **Grid 3 kolom**.
   - Logo utama berada di `public/logo.png` dan aset foto lokal di `public/images/`.

2. **Autentikasi & Database Supabase**
   - Halaman `/login` & `/register` + tombol **Logout** di Sidebar Desktop dan `/profil` via **Supabase Auth**.
   - Katalog paket dari tabel `packages` tampil di Landing Page (`/`) dan halaman Paket & Checkout (`/paket`).
   - Pembuatan pesanan menyimpan data ke tabel `orders` dan memperbarui `active_package` pada `profiles`.
   - Halaman `/profil` terhubung ke tabel `profiles` untuk mengubah nama (`full_name`), nomor HP (`phone`), alamat pengiriman (`address`), dan melihat paket aktif (`active_package`).

3. **Live Sensor IoT Realtime (`/kebun`)**
   - Menampilkan kartu komoditas organik dari tabel `crops_iot` (kelembapan tanah, suhu, pupuk organik, hitung mundur panen, lokasi bedeng, dan status) dengan langganan **Supabase Realtime** (`postgres_changes`).

4. **Asisten AI WawanFarm (`/ai-chat` & `/api/chat`)**
   - Menggunakan `@google/genai` (model `gemini-3.8-flash` sebagai pengganti `gemini-2.5-flash` yang sudah deprecated, dengan fallback otomatis ke `gemini-3.5-flash-lite` / `gemini-3.1-flash-lite`).
   - Membaca data terbaru dari tabel `crops_iot` dan `packages` di Supabase sebelum menjawab konsumen dan memberikan kartu rekomendasi pemesanan cepat.

## Menjalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`.
