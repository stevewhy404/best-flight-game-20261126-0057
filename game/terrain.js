// Ridgeline Courier — terrain: one seeded mountain valley with two airstrips,
// a river, a small town, and the target rings for every delivery leg.

import { mulberry32, clamp, lerp } from './util.js';

const WORLD_SEED = 20261126;

/** Airstrip definition: flat ground, runway, name, and which way it faces. */
export function makeStrips() {
  return [
    { id: 'A', name: 'PINEFIELD', x0: 120, x1: 460, dir: 1 },
    { id: 'B', name: 'EAGLE ROCK', x0: 5180, x1: 5520, dir: -1 },
  ];
}

/** Ring positions per leg: {x, alt, r} in metres. Legs fly A->B, B->A, A->B. */
export function makeRings() {
  return [
    [
      { x: 1250, alt: 165, r: 26 },
      { x: 2450, alt: 210, r: 26 },
      { x: 3900, alt: 150, r: 26 },
    ],
    [
      { x: 4300, alt: 190, r: 26 },
      { x: 3050, alt: 240, r: 26 },
      { x: 1700, alt: 140, r: 26 },
    ],
    [
      { x: 1100, alt: 230, r: 24 },
      { x: 2600, alt: 120, r: 24 },
      { x: 4700, alt: 200, r: 24 },
    ],
  ];
}

/**
 * Build the valley. Ground height is a sum of seeded sine ridges, flattened
 * to exact runway level under each airstrip, with a river channel near x=2600.
 */
export function createWorld() {
  const rng = mulberry32(WORLD_SEED);
  const ridgePhases = [];
  for (let i = 0; i < 7; i++) ridgePhases.push({ f: 0.0009 + rng() * 0.0022, p: rng() * Math.PI * 2, a: 26 + rng() * 46 });
  const strips = makeStrips();
  const rings = makeRings();
  const riverX = 2600;
  const townX = 3850;

  function rawHeight(x) {
    let h = 34;
    for (const r of ridgePhases) h += r.a * Math.sin(x * r.f + r.p);
    h += 58 * Math.max(0, Math.sin(x * 0.00042 + 1.2));
    // Keep the valley floor in a sane band: no pits below the river, no
    // peaks the plane cannot clear on a normal climb.
    return clamp(h, 5, 130);
  }

  function heightAt(x) {
    // Flatten ground under the runways so landings read clearly.
    for (const s of strips) {
      if (x > s.x0 - 90 && x < s.x1 + 90) {
        const edge = Math.min((x - (s.x0 - 90)) / 90, ((s.x1 + 90) - x) / 90, 1);
        return lerp(rawHeight(x), 30, clamp(edge, 0, 1));
      }
    }
    // River channel: dip the ground and let the water sit in it.
    const d = Math.abs(x - riverX);
    if (d < 70) return lerp(rawHeight(x), 12, 1 - d / 70);
    return rawHeight(x);
  }

  // Trees: seeded positions on the hillsides, away from runways and river.
  const trees = [];
  for (let x = 60; x < 5700; x += 14 + rng() * 26) {
    if (strips.some((s) => x > s.x0 - 120 && x < s.x1 + 120)) continue;
    if (Math.abs(x - riverX) < 110) continue;
    if (Math.abs(x - townX) < 260) continue;
    trees.push({ x, h: 9 + rng() * 12, lean: (rng() - 0.5) * 0.3 });
  }

  // Town buildings near x=3850, windows lit for the dusk look.
  const buildings = [];
  for (let i = 0; i < 9; i++) {
    const bx = townX - 220 + i * 52 + rng() * 14;
    buildings.push({ x: bx, w: 34 + rng() * 16, h: 26 + rng() * 34, lit: rng() > 0.35 });
  }

  // Clouds drift slowly; their positions are seeded so screenshots repeat.
  const clouds = [];
  for (let i = 0; i < 16; i++) clouds.push({ x: rng() * 5800, y: 300 + rng() * 130, s: 0.7 + rng() * 0.9, v: 2 + rng() * 4 });

  return { strips, rings, riverX, townX, trees, buildings, clouds, heightAt };
}

// ---------------------------------------------------------------- drawing

/** Sky gradient + low sun, drawn in screen space. */
export function drawSky(ctx, w, h, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2c4a72');
  g.addColorStop(0.45, '#7d9bb8');
  g.addColorStop(0.72, '#e8b06a');
  g.addColorStop(1, '#f7cf8e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Low sun, upper left, with a soft halo.
  const sx = w * 0.2;
  const sy = h * 0.2 + Math.sin(time * 0.05) * 2;
  const halo = ctx.createRadialGradient(sx, sy, 4, sx, sy, 130);
  halo.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  halo.addColorStop(0.35, 'rgba(255, 205, 120, 0.45)');
  halo.addColorStop(1, 'rgba(255, 205, 120, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sx - 140, sy - 140, 280, 280);
  ctx.fillStyle = '#ffedb8';
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, Math.PI * 2);
  ctx.fill();
}

/** Far mountain silhouettes (parallax 0.25) and near ridge (parallax 0.55). */
export function drawMountains(ctx, cam, w, h, scale) {
  const layers = [
    { par: 0.22, color: '#5d7391', amp: 150, base: 0.62 },
    { par: 0.5, color: '#47603f', amp: 95, base: 0.74 },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const off = cam.x * scale * L.par;
    for (let sx = 0; sx <= w; sx += 16) {
      const wx = (sx + off) / scale;
      const y = h * L.base - (Math.sin(wx * 0.004 + 2.1) * 0.6 + Math.sin(wx * 0.0013 + 0.7) * 0.4) * L.amp * 0.5 - L.amp * 0.5;
      ctx.lineTo(sx, y - cam.y * scale * L.par * 0.4);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

/** Clouds drifting across the sky (parallax 0.7). */
export function drawClouds(ctx, world, cam, w, h, scale, time) {
  ctx.fillStyle = 'rgba(255, 250, 240, 0.92)';
  for (const c of world.clouds) {
    const sx = ((c.x + time * c.v - cam.x * scale * 0.7) % 6400) * scale * 0.35 - 200;
    const sy = h - (c.y - cam.y) * scale * 0.7 - 260;
    if (sx < -260 || sx > w + 260) continue;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 62 * c.s, 17 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 42 * c.s, sy + 5, 44 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - 44 * c.s, sy + 6, 38 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Ground, river, town, trees and runways, in world space. */
export function drawGround(ctx, world, cam, w, h, scale) {
  const toScreenX = (wx) => (wx - cam.x) * scale;
  const toScreenY = (wy) => h - (wy - cam.y) * scale;
  const x0 = cam.x - 40;
  const x1 = cam.x + w / scale + 40;

  // Grassy ground fill.
  ctx.beginPath();
  ctx.moveTo(toScreenX(x0), toScreenY(world.heightAt(x0)));
  for (let wx = x0; wx <= x1; wx += 8) ctx.lineTo(toScreenX(wx), toScreenY(world.heightAt(wx)));
  ctx.lineTo(toScreenX(x1), h + 40);
  ctx.lineTo(toScreenX(x0), h + 40);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, toScreenY(120), 0, h);
  gg.addColorStop(0, '#5d7a3a');
  gg.addColorStop(1, '#33451f');
  ctx.fillStyle = gg;
  ctx.fill();

  // Rocky band along the ground line.
  ctx.strokeStyle = 'rgba(70, 60, 40, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let wx = x0; wx <= x1; wx += 8) {
    const sx = toScreenX(wx);
    const sy = toScreenY(world.heightAt(wx));
    if (wx === x0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // River: a blue band sitting in its channel.
  const rx0 = world.riverX - 62;
  const rx1 = world.riverX + 62;
  if (rx1 > x0 && rx0 < x1) {
    ctx.fillStyle = '#4d8fb5';
    ctx.beginPath();
    ctx.moveTo(toScreenX(rx0), toScreenY(12));
    ctx.lineTo(toScreenX(rx1), toScreenY(12));
    ctx.lineTo(toScreenX(rx1), toScreenY(4));
    ctx.lineTo(toScreenX(rx0), toScreenY(4));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(toScreenX(rx0 + 8), toScreenY(9));
    ctx.lineTo(toScreenX(rx1 - 8), toScreenY(9));
    ctx.stroke();
  }

  // Town buildings with lit windows.
  for (const b of world.buildings) {
    if (b.x + b.w < x0 || b.x > x1) continue;
    const gy = world.heightAt(b.x + b.w / 2);
    ctx.fillStyle = '#4a3f35';
    ctx.fillRect(toScreenX(b.x), toScreenY(gy + b.h), b.w * scale, b.h * scale);
    ctx.fillStyle = '#6b543a';
    ctx.fillRect(toScreenX(b.x), toScreenY(gy + b.h), b.w * scale, 4);
    if (b.lit) {
      ctx.fillStyle = '#ffd97a';
      ctx.fillRect(toScreenX(b.x + 6), toScreenY(gy + b.h - 12), 5, 6);
      ctx.fillRect(toScreenX(b.x + b.w - 12), toScreenY(gy + b.h - 22), 5, 6);
    }
  }

  // Pine trees.
  ctx.fillStyle = '#2c4a24';
  for (const t of world.trees) {
    if (t.x < x0 || t.x > x1) continue;
    const gy = world.heightAt(t.x);
    const sx = toScreenX(t.x);
    const sy = toScreenY(gy);
    const th = t.h * scale;
    ctx.beginPath();
    ctx.moveTo(sx + t.lean * th, sy - th);
    ctx.lineTo(sx - th * 0.36, sy);
    ctx.lineTo(sx + th * 0.36, sy);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(sx - 1.5, sy - 2, 3, 4);
  }

  // Runways: dark strips with white centre dashes and threshold bars.
  for (const s of world.strips) {
    const y = 30;
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(toScreenX(s.x0), toScreenY(y + 1.5), (s.x1 - s.x0) * scale, 3 * scale);
    ctx.fillStyle = '#e8e8e8';
    for (let wx = s.x0 + 18; wx < s.x1 - 10; wx += 34) {
      ctx.fillRect(toScreenX(wx), toScreenY(y + 0.6), 16 * scale, 1 * scale);
    }
    // Threshold bars at both ends.
    ctx.fillRect(toScreenX(s.x0 + 4), toScreenY(y + 1.5), 8 * scale, 3 * scale);
    ctx.fillRect(toScreenX(s.x1 - 12), toScreenY(y + 1.5), 8 * scale, 3 * scale);
    // Strip name sign.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.id} · ${s.name}`, toScreenX((s.x0 + s.x1) / 2), toScreenY(y) - 34);
    ctx.textAlign = 'left';
  }
}

/** Target rings for the active leg, glowing gold when unflown, green once passed. */
export function drawRings(ctx, world, leg, passed, cam, w, h, scale, time) {
  const toScreenX = (wx) => (wx - cam.x) * scale;
  const toScreenY = (wy) => h - (wy - cam.y) * scale;
  const rings = world.rings[leg] || [];
  rings.forEach((ring, i) => {
    const sx = toScreenX(ring.x);
    const sy = toScreenY(ring.alt);
    const r = ring.r * scale;
    if (sx < -r - 40 || sx > w + r + 40) return;
    const done = passed[i];
    const pulse = done ? 0 : 0.5 + 0.5 * Math.sin(time * 3 + i);
    ctx.save();
    ctx.strokeStyle = done ? 'rgba(120, 220, 130, 0.95)' : `rgba(255, 205, 90, ${0.65 + 0.35 * pulse})`;
    ctx.lineWidth = done ? 4 : 6;
    ctx.shadowColor = done ? '#78dc82' : '#ffcd5a';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = done ? 'rgba(120,220,130,0.9)' : 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(done ? '✓' : String(i + 1), sx, sy + 5);
    ctx.textAlign = 'left';
  });
}
