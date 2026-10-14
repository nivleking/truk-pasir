# Truk Pasir — Planning

## 1. Tujuan
Belajar SE + game dev 3D di web: arsitektur yang memisahkan logika murni (bisa di-TDD) dari render dan fisika.

## 2. Core loop
1. Spawn di tambang, mundur ke bawah corong pasir.
2. Pasir (bola-bola kecil) jatuh ke bak.
3. Bawa lewat jalan bergelombang, pelan-pelan biar tidak tumpah.
4. Angkat bak di zona tuang.
5. Skor = % pasir yang masuk zona, bonus waktu. Ulangi.

## 3. Kontrol
| Tombol | Aksi |
|---|---|
| W / S | gas / rem-mundur |
| A / D | belok |
| Space | rem tangan |
| Q / E | turunkan / angkat bak |
| C | ganti kamera |
| R | reset ronde |

## 4. Arsitektur
```
src/
  core/      logika murni, tanpa Three/Rapier (100% di-test)
    input.ts       state tombol -> perintah (throttle, steer, tilt)
    dumpBed.ts     state machine bak: Down / Raising / Up / Lowering, batas sudut
    score.ts       hitung %, bonus waktu, rank
    round.ts       state ronde: Loading / Driving / Dumping / Finished
  physics/   adapter Rapier
    world.ts       inisialisasi world, step tetap 60 Hz
    truck.ts       DynamicRayCastVehicleController, 6 roda, massa berat
    sand.ts        pool bola pasir (target 300-500), sleep saat diam
  render/    adapter Three.js
    scene.ts, camera.ts (chase cam), instancedSand.ts
  game.ts    loop utama: input -> core -> physics -> render
  main.ts
tests/       Vitest, cermin struktur core/
```
Aturan: `core/` tidak boleh import Three atau Rapier.

## 5. Tahapan
- **Fase 0 – Setup**: Vite + TS strict + Vitest + ESLint, scene kosong muncul.
- **Fase 1 – Truk jalan** (TDD `input.ts`): tanah datar, truk kotak dengan suspensi, chase cam.
- **Fase 2 – Bak & pasir** (TDD `dumpBed.ts`): bak berengsel, corong pasir, instanced spheres.
- **Fase 3 – Ronde & skor** (TDD `score.ts`, `round.ts`): zona tuang, hitung pasir, HUD, timer.
- **Fase 4 – Jalan & feel**: heightfield bergelombang, tuning suspensi/massa, suara mesin.
- **Nanti**: model truk asli (glTF), beberapa level, gamepad, partikel debu.

## 6. Risiko
- Performa pasir: batasi jumlah, pakai sleep, ukur FPS sejak Fase 2.
- Feel truk: siapkan panel debug (lil-gui) untuk tuning live.
- Pasir tembus bak: aktifkan CCD, ketebalan dinding cukup.

## 7. Definisi selesai MVP
1 peta, 1 truk, bisa isi-bawa-tuang, skor tampil, 60 FPS di laptop.
