# TODO

## Ditahan (hold)
- [ ] **Kamera goyang sedikit-sedikit saat melaju** (bukan flicker, view bergoyang halus).
  Sudah dicoba: interpolasi posisi truk antar langkah fisika, ganti grid jadi batu, shadow ikut truk + texel snap. Masih terasa di Mac.
  Dugaan berikutnya:
  - Kamera mengikuti yaw/pitch body yang ikut berayun karena suspensi -> pakai yaw yang dihaluskan dan abaikan pitch/roll.
  - `camera.lookAt` ke posisi body yang memantul -> haluskan juga titik lookAt.
  - Suspensi terlalu lembek -> naikkan damping (`setWheelSuspensionCompression/Relaxation`).
  - Cek dengan overlay FPS/frame time (stats.js) di Mac.
