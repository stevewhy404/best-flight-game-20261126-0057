// Ridgeline Courier — the Kestrel-9 bush plane, drawn in canvas paths.

import { clamp } from './util.js';

/**
 * Draw the plane at screen position (sx, sy), facing east (dirX=+1) or west.
 * `scale` is pixels per metre; the plane is ~13 m long. `time` spins the prop.
 */
export function drawPlane(ctx, plane, sx, sy, scale, dirX, time) {
  ctx.save();
  ctx.translate(sx, sy);
  // Bank rolls the airframe a little; pitch aims the nose.
  ctx.rotate(plane.bank * 0.55);
  ctx.rotate(-plane.pitch * 0.9 * dirX);
  ctx.scale(dirX, 1);
  const S = scale; // px per metre, plane drawn in metre units then scaled

  // Exhaust puffs behind the tail when the engine works hard.
  if (plane.throttle > 0.5 && !plane.onGround) {
    ctx.fillStyle = 'rgba(200, 200, 200, 0.35)';
    for (let i = 0; i < 3; i++) {
      const px = -8.5 - i * 2.2 - ((time * 30 + i * 7) % 6);
      const py = 0.4 + Math.sin(time * 9 + i * 2) * 0.5;
      ctx.beginPath();
      ctx.arc(px * S, py * S, (0.9 - i * 0.2) * S, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Tail: vertical fin and horizontal stabiliser.
  ctx.fillStyle = '#b3402e';
  ctx.beginPath();
  ctx.moveTo(-6.2 * S, -0.2 * S);
  ctx.lineTo(-7.6 * S, -2.6 * S);
  ctx.lineTo(-6.4 * S, -2.7 * S);
  ctx.lineTo(-5.2 * S, -0.4 * S);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8c2f22';
  ctx.beginPath();
  ctx.moveTo(-6.6 * S, -0.1 * S);
  ctx.lineTo(-8.2 * S, -0.9 * S);
  ctx.lineTo(-5.6 * S, -0.7 * S);
  ctx.closePath();
  ctx.fill();

  // Fuselage: a warm cream body with a red cheatline.
  ctx.fillStyle = '#f2e6c8';
  ctx.beginPath();
  ctx.moveTo(-6.8 * S, -0.5 * S);
  ctx.quadraticCurveTo(-2 * S, -1.5 * S, 4.6 * S, -0.9 * S);
  ctx.quadraticCurveTo(6.4 * S, -0.6 * S, 6.6 * S, 0.1 * S);
  ctx.quadraticCurveTo(5.4 * S, 0.9 * S, 0 * S, 1.0 * S);
  ctx.quadraticCurveTo(-5 * S, 1.0 * S, -6.8 * S, 0.4 * S);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b3402e';
  ctx.fillRect(-5.4 * S, 0.05 * S, 11.4 * S, 0.34 * S);

  // Cabin windows, lit warm from inside.
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.moveTo(0.6 * S, -1.05 * S);
  ctx.lineTo(2.6 * S, -1.0 * S);
  ctx.lineTo(2.9 * S, -0.25 * S);
  ctx.lineTo(0.4 * S, -0.3 * S);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c4a72';
  ctx.beginPath();
  ctx.moveTo(0.8 * S, -0.9 * S);
  ctx.lineTo(2.4 * S, -0.88 * S);
  ctx.lineTo(2.6 * S, -0.35 * S);
  ctx.lineTo(0.6 * S, -0.38 * S);
  ctx.closePath();
  ctx.fill();

  // Wing: high wing over the cabin, slight dihedral.
  ctx.fillStyle = '#c94f38';
  ctx.beginPath();
  ctx.moveTo(-1.2 * S, -1.35 * S);
  ctx.lineTo(1.4 * S, -1.5 * S);
  ctx.lineTo(1.8 * S, -0.9 * S);
  ctx.lineTo(-0.9 * S, -0.75 * S);
  ctx.closePath();
  ctx.fill();

  // Wing strut.
  ctx.strokeStyle = '#7a3a28';
  ctx.lineWidth = 0.22 * S;
  ctx.beginPath();
  ctx.moveTo(0.4 * S, -0.8 * S);
  ctx.lineTo(1.6 * S, 0.7 * S);
  ctx.stroke();

  // Spinning prop: a blurred disc plus two blades at the prop angle.
  const px = 6.7 * S;
  ctx.fillStyle = 'rgba(60, 60, 60, 0.25)';
  ctx.beginPath();
  ctx.ellipse(px, 0, 0.5 * S, 2.6 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(px, 0);
  ctx.rotate(plane.propAngle);
  ctx.fillStyle = '#2e2a26';
  ctx.fillRect(-0.22 * S, -2.7 * S, 0.44 * S, 5.4 * S);
  ctx.restore();
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(px, 0, 0.45 * S, 0, Math.PI * 2);
  ctx.fill();

  // Landing gear: two wheels and struts, tucked look when retracted.
  if (plane.gear) {
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 0.25 * S;
    ctx.beginPath();
    ctx.moveTo(2.6 * S, 0.9 * S);
    ctx.lineTo(3.1 * S, 2.1 * S);
    ctx.moveTo(-2.2 * S, 0.9 * S);
    ctx.lineTo(-2.6 * S, 2.1 * S);
    ctx.stroke();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(3.1 * S, 2.35 * S, 0.55 * S, 0, Math.PI * 2);
    ctx.arc(-2.6 * S, 2.35 * S, 0.55 * S, 0, Math.PI * 2);
    ctx.fill();
  }

  // Navigation lights: red left, green right, blinking white tail strobe.
  const strobe = Math.sin(time * 6) > 0.6;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-6.6 * S, -0.6 * S, 0.28 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#34d17b';
  ctx.beginPath();
  ctx.arc(6.2 * S, -0.5 * S, 0.28 * S, 0, Math.PI * 2);
  ctx.fill();
  if (strobe) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-7.4 * S, -2.5 * S, 0.35 * S, 0, Math.PI * 2);
    ctx.fill();
  }

  // Damage smoke: dark puffs from the cowling when hurt.
  if (plane.damage > 25) {
    ctx.fillStyle = `rgba(40, 40, 40, ${clamp(plane.damage / 160, 0.1, 0.55)})`;
    const puffs = 2 + Math.floor(plane.damage / 40);
    for (let i = 0; i < puffs; i++) {
      const ox = 3 - i * 2.4 - ((time * 14 + i * 9) % 8);
      ctx.beginPath();
      ctx.arc(ox * S, (-1.6 - i * 0.5) * S, (0.8 + i * 0.35) * S, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // Takeoff dust kicked up behind the wheels.
  if (plane.dust > 0.05 && plane.onGround) {
    ctx.fillStyle = `rgba(190, 170, 130, ${plane.dust * 0.5})`;
    for (let i = 0; i < 5; i++) {
      const ox = -8 - i * 2 - ((time * 22 + i * 5) % 10);
      ctx.beginPath();
      ctx.arc(sx + ox * scale * dirX, sy + 2.4 * scale, (1.1 + i * 0.3) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Crash aftermath: a dark scorch mark and bent airframe silhouette on the ground. */
export function drawWreck(ctx, plane, sx, sy, scale, dirX) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(dirX, 1);
  ctx.fillStyle = 'rgba(20, 16, 12, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0.4 * scale, 9 * scale, 1.1 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a332c';
  ctx.beginPath();
  ctx.moveTo(-6 * scale, 0);
  ctx.lineTo(5 * scale, -0.4 * scale);
  ctx.lineTo(6 * scale, 0.4 * scale);
  ctx.lineTo(-5 * scale, 0.8 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
