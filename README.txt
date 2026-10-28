# Lintas — Prototipe Pelaporan Rambu Jalan

## Cara menjalankan
1. Ekstrak `lintas-final.zip` ke folder proyekmu.
2. Buka folder hasil ekstrak di VS Code.
3. Buka `index.html` di browser. Jika sudah memasang ekstensi Live Server, klik kanan `index.html` → **Open with Live Server**.
4. Pastikan internet aktif karena Leaflet, peta OpenStreetMap, Font Awesome, dan Google Fonts dimuat dari CDN.

## Fitur yang tersedia
- Peta Palu dengan penanda rambu contoh.
- Pencarian laporan/rambu.
- Formulir anonim yang muncul dari sisi kanan.
- Pilih koordinat dengan mengeklik peta saat formulir terbuka.
- Tambah laporan, penanda, daftar laporan, ringkasan statistik, dan aktivitas notifikasi.
- Navigasi Peta, Laporan, Data Rambu, Statistik.
- Tata letak responsif.

## Batasan penting
Ini masih prototipe front-end. Data laporan dan foto hanya berada dalam memori sesi browser, tidak tersimpan permanen dan tidak dibagikan ke pengguna lain. Memuat ulang halaman akan mengembalikan data contoh. Fitur notifikasi hanya ringkasan lokal, bukan notifikasi pemerintah. Foto hanya dipratinjau di browser dan tidak diunggah. Untuk versi publik, hubungkan ke backend/database seperti Supabase dan tentukan proses verifikasi serta moderasi laporan.

## File
- `index.html` — struktur halaman.
- `style.css` — desain dan responsivitas.
- `app.js` — peta, pencarian, formulir, laporan, notifikasi, dan statistik.
