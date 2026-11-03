import { toMap } from '../core/minimap';
import { levelObstacles, PIT, type Level } from '../core/levels';
import { MAP_HALF_SIZE } from '../physics/world';

export interface Blip {
  x: number;
  z: number;
  /** Heading around Y, radians (0 = facing +Z). */
  yaw: number;
  active: boolean;
}

/** Corner mini-map: static level layer drawn once per level, vehicles redrawn every frame. */
export function createMinimap(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const css = canvas.clientWidth || 180;
  const size = css * dpr;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const bg = document.createElement('canvas');
  bg.width = bg.height = size;
  const map = (p: { x: number; z: number }) => toMap(p, MAP_HALF_SIZE, size);
  const scale = size / (2 * MAP_HALF_SIZE);

  function setLevel(level: Level) {
    const g = bg.getContext('2d')!;
    g.clearRect(0, 0, size, size);
    g.fillStyle = 'rgba(201,166,107,.92)';
    g.fillRect(0, 0, size, size);
    // Road: the track polyline drawn wide, then walls and obstacles on top.
    if (level.track) {
      g.strokeStyle = '#dcc08a';
      g.lineWidth = level.track.halfWidth * 2 * scale;
      g.lineJoin = 'miter';
      g.beginPath();
      level.track.points.forEach((p, i) => {
        const m = map(p);
        if (i) g.lineTo(m.x, m.y);
        else g.moveTo(m.x, m.y);
      });
      g.stroke();
    }
    for (const o of levelObstacles(level)) {
      const c = map(o);
      g.save();
      g.translate(c.x, c.y);
      // The map is the world turned 180° and seen from above, so a positive yaw turns counter-clockwise.
      g.rotate(-((o.yaw ?? 0) * Math.PI) / 180);
      g.fillStyle = o.kind === 'cone' ? '#ff6a13' : o.kind === 'ramp' ? '#8f6b3e' : o.track ? '#5e4524' : '#7d7d78';
      const w = Math.max(o.hx * 2 * scale, 2 * dpr);
      const hgt = Math.max(o.hz * 2 * scale, 2 * dpr);
      g.fillRect(-w / 2, -hgt / 2, w, hgt);
      g.restore();
    }
    const pit = map(level.pit);
    const ps = PIT.half * 2 * scale;
    g.fillStyle = '#3d2e1a';
    g.fillRect(pit.x - ps / 2, pit.y - ps / 2, ps, ps);
    g.strokeStyle = '#f2b51b';
    g.lineWidth = 2 * dpr;
    g.strokeRect(pit.x - ps / 2, pit.y - ps / 2, ps, ps);
    const hop = map(level.hopper);
    g.fillStyle = '#6b7680';
    g.beginPath();
    g.arc(hop.x, hop.y, 4 * dpr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 1.5 * dpr;
    g.stroke();
  }

  function draw(blips: Blip[]) {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(bg, 0, 0);
    for (const b of blips) {
      const m = map(b);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(-b.yaw);
      const s = (b.active ? 7 : 5) * dpr;
      ctx.fillStyle = b.active ? '#f2b51b' : '#efe6d2';
      ctx.strokeStyle = '#17140f';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, s);
      ctx.lineTo(-s * 0.7, s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  return { setLevel, draw };
}
