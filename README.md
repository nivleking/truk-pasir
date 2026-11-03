# Truk Pasir

Game web 3D: kendarai truk berat (rasa RC), isi bak dengan pasir, bawa lewat jalan bergelombang tanpa banyak tumpah, lalu tuang di zona target.

- Stack: Vite + TypeScript (strict) + Three.js + Rapier (`@dimforge/rapier3d-compat`), Vitest
- Workflow: TDD untuk logika murni (`src/core`, di-test di `tests/core`); render & fisika dicek manual di browser
- Rencana lengkap: [docs/PLAN.md](docs/PLAN.md), catatan terbuka: [docs/TODO.md](docs/TODO.md)

Status: playable. Ada beberapa level dan kendaraan, mode karier (beli & upgrade kendaraan), skor tertinggi, dan audio prosedural.

## Menjalankan

Butuh Node 22.12 atau lebih baru.

```bash
npm install
npm run dev        # server dev di http://localhost:5173
npm test           # unit test (Vitest)
npm run build      # cek tipe + build produksi ke dist/
npm run preview    # sajikan dist/ secara lokal
```

## Struktur

```
src/
  core/      logika murni tanpa Three/Rapier (di-test)
  physics/   adapter Rapier
  render/    adapter Three.js
  main.ts    loop utama: input -> core -> physics -> render
tests/core/  Vitest, cermin src/core
```

## Deploy

Situs statis di Vercel; `vercel.json` mengatur build (`npm run build`, output `dist`).
WASM Rapier sudah tertanam di bundle JS (`rapier3d-compat`), jadi tidak perlu file `.wasm` terpisah.
