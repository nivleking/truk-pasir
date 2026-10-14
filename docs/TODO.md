# TODO

## Ditahan (hold)
- [ ] **Kamera goyang sedikit-sedikit saat melaju** (bukan flicker, view bergoyang halus).
  Sudah dicoba: interpolasi posisi truk antar langkah fisika, ganti grid jadi batu, shadow ikut truk + texel snap. Masih terasa di Mac.
  Dugaan berikutnya:
  - Kamera mengikuti yaw/pitch body yang ikut berayun karena suspensi -> pakai yaw yang dihaluskan dan abaikan pitch/roll.
  - `camera.lookAt` ke posisi body yang memantul -> haluskan juga titik lookAt.
  - Suspensi terlalu lembek -> naikkan damping (`setWheelSuspensionCompression/Relaxation`).
  - Cek dengan overlay FPS/frame time (stats.js) di Mac.
  - 2026-10-14: yaw & lookAt sudah dihaluskan; sekarang tinggi kamera mengikuti truk jauh lebih lambat (abaikan pantulan suspensi). Overlay frame time: tekan F. Kalau masih goyang, cek angka 'worst ms' di overlay.
