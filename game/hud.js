// Ridgeline Courier — HUD top bar and the lit instrument panel.

import { clamp, fmt1 } from './util.js';
import { headingDegrees } from './physics.js';

/** Top bar: altitude, speed, heading, score, fuel, damage, mission line. */
export function drawHud(ctx, state, w) {
  const { plane, score, leg, legs, time } = state;
  const hdg = headingDegrees(plane);
  const spdKmh = Math.round(plane.speed * 3.6);
  const altM = Math.max(0, Math.round(plane.alt - 30));

  ctx.save();
  // Translucent top strip.
  ctx.fillStyle = 'rgba(10, 16, 28, 0.55)';
  ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = '#ffd97a';
  ctx.font = 'bold 17px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ALT ${altM} m`, 16, 29);
  ctx.fillText(`SPD ${spdKmh} km/h`, 170, 29);
  ctx.fillText(`HDG ${String(hdg).padStart(3, '0')}°`, 350, 29);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`SCORE ${score}`, 520, 29);
  ctx.fillStyle = '#9fd8ff';
  const legName = legs[leg] ? legs[leg].name : 'DONE';
  ctx.fillText(`LEG ${Math.min(leg + 1, 3)}/3 · ${legName}`, 680, 29);

  // Fuel bar, top right.
  const fx = w - 250;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(fx, 14, 130, 14);
  ctx.fillStyle = plane.fuel < 20 ? (Math.sin(time * 6) > 0 ? '#ff5a4a' : '#ffb14a') : '#7ddb8a';
  ctx.fillRect(fx, 14, 130 * clamp(plane.fuel / 100, 0, 1), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText(`FUEL ${Math.round(plane.fuel)}%`, fx + 136, 27);

  // Damage bar under the fuel bar when hurt.
  if (plane.damage > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(fx, 32, 130, 6);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(fx, 32, 130 * clamp(plane.damage / 100, 0, 1), 6);
  }
  ctx.restore();
}

/** Bottom instrument panel: horizon, altimeter, airspeed, compass, fuel gauge. */
export function drawInstruments(ctx, state, w, h) {
  const { plane } = state;
  const panelH = 108;
  const py = h - panelH;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 18, 32, 0.82)';
  ctx.fillRect(0, py, w, panelH);
  ctx.fillStyle = 'rgba(255, 217, 122, 0.35)';
  ctx.fillRect(0, py, w, 2);

  const cx = 90;
  const cy = py + panelH / 2 + 4;

  // --- Artificial horizon (rolls with bank, pitches with pitch).
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.bank * 0.9);
  ctx.translate(0, plane.pitch * 70);
  ctx.fillStyle = '#3d6f9e';
  ctx.fillRect(-44, -44, 88, 44);
  ctx.fillStyle = '#8a6a3b';
  ctx.fillRect(-44, 0, 88, 44);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-44, 0);
  ctx.lineTo(44, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffd97a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.moveTo(cx + 8, cy);
  ctx.lineTo(cx + 26, cy);
  ctx.stroke();
  label(ctx, 'HORIZON', cx, py + 14);

  // --- Altimeter dial: 0–500 m.
  drawDial(ctx, cx + 130, cy, 40, plane.alt - 30, 0, 500, 'm', '#ffd97a');
  label(ctx, 'ALTITUDE', cx + 130, py + 14);

  // --- Airspeed dial: 0–360 km/h, red arc past 300, stall band below 95.
  drawDial(ctx, cx + 260, cy, 40, plane.speed * 3.6, 0, 360, 'km/h', '#9fd8ff', [
    { from: 0, to: 95, color: '#ff5a4a' },
    { from: 300, to: 360, color: '#ff5a4a' },
  ]);
  label(ctx, 'AIRSPEED', cx + 260, py + 14);

  // --- Compass tape: heading with cardinal marks.
  const tx = cx + 390;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(tx - 90, cy - 26, 180, 52);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(tx - 90, cy - 26, 180, 52);
  const hdg = headingDegrees(plane);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Verdana, sans-serif';
  ctx.textAlign = 'center';
  // Ticks every 15 degrees, labels every 30 so the numbers never collide.
  for (let d = -60; d <= 60; d += 15) {
    const deg = ((hdg + d) % 360 + 360) % 360;
    const x = tx + d * 1.4;
    ctx.fillRect(x - 0.5, cy - 22, 1, 8);
    if (d % 30 !== 0) continue;
    const card = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg).padStart(3, '0');
    ctx.fillText(card, x, cy + 5);
  }
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.moveTo(tx - 6, cy - 26);
  ctx.lineTo(tx + 6, cy - 26);
  ctx.lineTo(tx, cy - 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  label(ctx, 'HEADING', tx, py + 14);

  // --- Throttle + gear + flaps readouts, right side.
  const rx = w - 210;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`THR ${Math.round(plane.throttle * 100)}%`, rx, cy - 22);
  ctx.fillText(`GEAR ${plane.gear ? 'DOWN' : 'UP'}`, rx, cy + 2);
  ctx.fillText(`FLAPS ${plane.flaps ? 'ON' : 'OFF'}`, rx, cy + 26);
  ctx.fillStyle = plane.speed < 26 && !plane.onGround ? '#ff5a4a' : '#7ddb8a';
  ctx.fillText(plane.onGround ? 'ON GROUND' : plane.speed < 26 ? 'STALL!' : 'AIRBORNE', rx, cy + 50);
  ctx.restore();
}

function label(ctx, text, x, y) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '10px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A round gauge with a glowing needle and optional red arcs. */
function drawDial(ctx, cx, cy, r, value, min, max, unit, color, arcs) {
  ctx.save();
  // Face.
  ctx.fillStyle = '#101828';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Red arcs.
  if (arcs) {
    for (const a of arcs) {
      const a0 = (-210 + (a.from / (max - min)) * 300) * (Math.PI / 180);
      const a1 = (-210 + (a.to / (max - min)) * 300) * (Math.PI / 180);
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, a0, a1);
      ctx.stroke();
    }
  }
  // Ticks.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i++) {
    const a = (-210 + i * 30) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
    ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  // Needle with glow.
  const frac = clamp((value - min) / (max - min), 0, 1);
  const ang = (-210 + frac * 300) * (Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * (r - 10), cy + Math.sin(ang) * (r - 10));
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  // Digital readout.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${fmt1(value)}`, cx, cy + r - 12);
  ctx.font = '10px Verdana, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(unit, cx, cy + r - 1);
  ctx.restore();
}
