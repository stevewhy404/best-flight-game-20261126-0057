// Ridgeline Courier — game loop, input, camera, states and screenshot presets.

import { clamp, approach } from './util.js';
import { createWorld, drawSky, drawMountains, drawClouds, drawGround, drawRings } from './terrain.js';
import { makePlane, stepFlight, headingDegrees } from './physics.js';
import { drawPlane, drawWreck } from './aircraft.js';
import { drawHud, drawInstruments } from './hud.js';
import { createAudio } from './audio.js';
import { LEGS, makeRun, ringsFlown, ringPoints } from './missions.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280;
const H = 720;
const SCALE_CHASE = 1.5;
const SCALE_WIDE = 1.1;

const world = createWorld();
const audio = createAudio();
const params = new URLSearchParams(location.search);
const shot = Number(params.get('shot') || 0);

const game = {
  state: 'title', // title | playing | paused | crashed | won
  view: 1, // 1 chase, 2 cockpit, 3 wide
  run: makeRun(),
  plane: makePlane(world.strips[0]),
  cam: { x: 0, y: 0 },
  time: 0,
  toast: '',
  toastUntil: 0,
  landingHandled: false,
  keys: {},
  mouse: { y: 0.5, down: false },
};

function showToast(text, seconds = 2.2) {
  game.toast = text;
  game.toastUntil = game.time + seconds;
}

function startLeg(leg) {
  const L = LEGS[leg];
  const strip = world.strips[L.from];
  game.plane = makePlane(strip);
  game.plane.heading = strip.dir > 0 ? 0 : Math.PI;
  game.run.passed = [false, false, false];
  game.landingHandled = false;
  game.cam.x = clamp(game.plane.x - 260, 0, 5760 - 640);
  game.cam.y = clamp(game.plane.alt - 240, -260, 60);
  showToast(`LEG ${leg + 1}/3 — ${L.name}`, 3);
}

function startRun() {
  game.run = makeRun();
  game.run.started = true;
  startLeg(0);
  game.state = 'playing';
  audio.unlock();
  audio.click();
}

/** Screenshot presets: real gameplay states, rendered live by the engine. */
function applyShot(n) {
  game.run.started = true;
  game.state = 'playing';
  if (n === 1) {
    // Takeoff roll on Pinefield's runway.
    startLeg(0);
    game.plane.throttle = 0.85;
    game.plane.speed = 24;
    game.plane.pitch = 0.05;
  } else if (n === 2) {
    // Cruising over the river town, ring 2 ahead, first ring already flown.
    game.run.leg = 0;
    game.run.passed = [true, false, false];
    game.run.score = 312;
    game.plane = makePlane(world.strips[0]);
    game.plane.onGround = false;
    game.plane.x = 3400;
    game.plane.alt = 190;
    game.plane.speed = 62;
    game.plane.throttle = 0.7;
    game.plane.pitch = 0.02;
  } else if (n === 3) {
    // Threading ring 2 over the river.
    game.run.leg = 0;
    game.run.passed = [true, false, false];
    game.run.score = 312;
    game.plane = makePlane(world.strips[0]);
    game.plane.onGround = false;
    game.plane.x = 2426;
    game.plane.alt = 208;
    game.plane.speed = 66;
    game.plane.throttle = 0.72;
  } else {
    // Final approach to Eagle Rock, gear down, runway ahead.
    game.run.leg = 0;
    game.run.passed = [true, true, true];
    game.run.score = 980;
    game.plane = makePlane(world.strips[0]);
    game.plane.onGround = false;
    game.plane.x = 4900;
    game.plane.alt = 96;
    game.plane.speed = 48;
    game.plane.throttle = 0.42;
    game.plane.pitch = -0.06;
    game.plane.gear = true;
    game.plane.flaps = true;
  }
  game.cam.x = clamp(game.plane.x - 260, 0, 5760 - 640);
  game.cam.y = clamp(game.plane.alt - 240, -260, 60);
}

// ---------------------------------------------------------------- input

const KEYMAP = {
  ArrowUp: 'pitchUp',
  ArrowDown: 'pitchDown',
  ArrowLeft: 'bankLeft',
  ArrowRight: 'bankRight',
  KeyW: 'thrUp',
  KeyS: 'thrDown',
  Space: 'flaps',
  KeyG: 'gear',
  KeyP: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
  Enter: 'start',
  Digit1: 'view1',
  Digit2: 'view2',
  Digit3: 'view3',
};

const pressed = {};
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  pressed[KEYMAP[e.code] || e.code] = true;
  audio.unlock();
  if (e.code === 'Enter' && (game.state === 'title' || game.state === 'won')) startRun();
  if (e.code === 'KeyR' && (game.state === 'crashed' || game.state === 'won' || game.state === 'playing')) startRun();
  if (e.code === 'KeyP' && (game.state === 'playing' || game.state === 'paused')) {
    game.state = game.state === 'playing' ? 'paused' : 'playing';
  }
  if (e.code === 'KeyM') audio.toggleMute();
  if (e.code === 'KeyG' && game.state === 'playing') {
    game.plane.gear = !game.plane.gear;
    showToast(game.plane.gear ? 'GEAR DOWN' : 'GEAR UP', 1.2);
  }
  if (e.code === 'Digit1') game.view = 1;
  if (e.code === 'Digit2') game.view = 2;
  if (e.code === 'Digit3') game.view = 3;
});
window.addEventListener('keyup', (e) => {
  pressed[KEYMAP[e.code] || e.code] = false;
});
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  game.mouse.y = clamp((e.clientY - r.top) / r.height, 0, 1);
});
canvas.addEventListener('mousedown', () => {
  game.mouse.down = true;
  audio.unlock();
});
window.addEventListener('mouseup', () => {
  game.mouse.down = false;
});
canvas.addEventListener('click', () => {
  if (game.state === 'title' || game.state === 'won') startRun();
});

// ---------------------------------------------------------------- update

function readInput() {
  let pitch = 0;
  if (pressed.pitchUp) pitch += 1;
  if (pressed.pitchDown) pitch -= 1;
  // Mouse: holding the pointer high pulls the nose up gently.
  if (game.mouse.down) pitch += (0.5 - game.mouse.y) * 1.2;
  let bank = 0;
  if (pressed.bankLeft) bank -= 1;
  if (pressed.bankRight) bank += 1;
  let throttle = 0;
  if (pressed.thrUp || game.mouse.down) throttle += 1;
  if (pressed.thrDown) throttle -= 1;
  return {
    pitch: clamp(pitch, -1, 1),
    bank: clamp(bank, -1, 1),
    throttle,
    flaps: !!pressed.flaps,
    gear: game.plane.gear,
  };
}

function update(dt) {
  game.time += dt;
  const plane = game.plane;
  if (game.state !== 'playing') return;
  game.run.time += dt;

  plane.flaps = !!pressed.flaps;
  stepFlight(plane, readInput(), dt, world);
  audio.engine(plane.throttle, !plane.onGround);

  if (plane.crashed) {
    game.state = 'crashed';
    audio.crash();
    return;
  }

  // Rings.
  const rings = world.rings[game.run.leg];
  for (const i of ringsFlown(plane, rings, game.run.passed)) {
    game.run.passed[i] = true;
    const pts = ringPoints(plane);
    game.run.score += pts;
    plane.fuel = Math.min(100, plane.fuel + 4);
    audio.ring();
    showToast(`RING ${i + 1} · +${pts} PTS`, 1.6);
  }

  // Touchdown: deliver the parcel, or complain about the wrong strip.
  if (plane.landed && !game.landingHandled) {
    game.landingHandled = true;
    const strip = world.strips.find((s) => plane.x >= s.x0 && plane.x <= s.x1);
    const target = LEGS[game.run.leg].to;
    if (strip && strip.id === world.strips[target].id) {
      const clean = plane.damage < 30;
      const bonus = clean ? 500 : 200;
      game.run.score += bonus;
      game.run.delivered += 1;
      plane.fuel = 100;
      audio.land();
      if (game.run.leg >= 2) {
        game.state = 'won';
        showToast('', 0);
      } else {
        showToast(`DELIVERED · +${bonus} PTS — ${LEGS[game.run.leg].cargo}`, 3);
        game.run.leg += 1;
        setTimeout(() => {
          if (game.state === 'playing') startLeg(game.run.leg);
        }, 2600);
      }
    } else {
      showToast('Wrong strip — that is home. Take off and try again.', 2.5);
      plane.landed = false;
      game.landingHandled = false;
    }
  }
  if (!plane.onGround) game.landingHandled = false;

  if (plane.fuel <= 0 && !plane.onGround) showToast('FUEL EMPTY — glide to a strip!', 1);
  if (plane.fuel < 15 && plane.fuel > 0 && Math.floor(game.time * 2) % 2 === 0) {
    showToast('LOW FUEL', 0.5);
  }

  // Camera follows the plane, eased. The plane sits a little below centre
  // so the ground and the runway stay in frame while cruising.
  const scale = game.view === 3 ? SCALE_WIDE : SCALE_CHASE;
  const ahead = Math.cos(plane.heading) >= 0 ? 260 : 590;
  const tx = clamp(plane.x - ahead, 0, 5760 - W / scale);
  const ty = clamp(plane.alt - 240, -260, 60);
  game.cam.x = approach(game.cam.x, tx, Math.abs(tx - game.cam.x) * dt * 3 + 2 * dt);
  game.cam.y = approach(game.cam.y, ty, Math.abs(ty - game.cam.y) * dt * 3 + 2 * dt);
}

// ---------------------------------------------------------------- render

function render() {
  const scale = game.view === 3 ? SCALE_WIDE : SCALE_CHASE;
  const plane = game.plane;
  const cam = game.cam;

  drawSky(ctx, W, H, game.time);
  drawClouds(ctx, world, cam, W, H, scale, game.time);
  drawMountains(ctx, cam, W, H, scale);
  drawGround(ctx, world, cam, W, H, scale);
  drawRings(ctx, world, game.run.leg, game.run.passed, cam, W, H, scale, game.time);

  // Plane screen position (cockpit view hides the airframe).
  const dirX = Math.cos(plane.heading) >= 0 ? 1 : -1;
  const sx = (plane.x - cam.x) * scale;
  const sy = H - (plane.alt - cam.y) * scale;
  if (game.view !== 2) {
    // Drawn 1.6x the world scale so the Kestrel reads clearly at chase zoom.
    if (plane.crashed) drawWreck(ctx, plane, sx, sy, scale * 1.6, dirX);
    else drawPlane(ctx, plane, sx, sy, scale * 1.6, dirX, game.time);
  } else {
    drawCockpitFrame(ctx);
  }

  drawHud(ctx, { plane, score: game.run.score, leg: game.run.leg, legs: LEGS, time: game.time }, W);
  drawInstruments(ctx, { plane }, W, H);

  if (game.time < game.toastUntil && game.toast) {
    ctx.save();
    ctx.font = 'bold 26px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd97a';
    ctx.fillText(game.toast, W / 2, 92);
    ctx.restore();
  }

  if (game.state === 'title') drawTitle(ctx);
  if (game.state === 'paused') drawOverlay(ctx, 'PAUSED', 'Press P to keep flying');
  if (game.state === 'crashed') {
    drawOverlay(ctx, 'CRASHED', `${plane.crashReason} · Score ${game.run.score} · Press R to fly again`);
  }
  if (game.state === 'won') {
    drawOverlay(
      ctx,
      'ALL DELIVERIES DONE!',
      `Final score ${game.run.score} · ${game.run.time.toFixed(0)}s in the air · Press R to fly again`
    );
  }
}

/** Cockpit view: struts, canopy bar and a hint of nose + prop. */
function drawCockpitFrame(ctx) {
  ctx.save();
  ctx.fillStyle = '#1c222e';
  // Side struts.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(150, 0);
  ctx.lineTo(60, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W - 150, 0);
  ctx.lineTo(W - 60, H);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // Top canopy bar.
  ctx.fillRect(0, 0, W, 34);
  // Nose + spinning prop hint at the bottom centre.
  ctx.fillStyle = '#f2e6c8';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 130, H);
  ctx.lineTo(W / 2 + 130, H);
  ctx.lineTo(W / 2 + 46, H - 96);
  ctx.lineTo(W / 2 - 46, H - 96);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(60,60,60,0.3)';
  ctx.beginPath();
  ctx.ellipse(W / 2, H - 150, 8, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e2a26';
  ctx.save();
  ctx.translate(W / 2, H - 150);
  ctx.rotate(game.plane.propAngle);
  ctx.fillRect(-4, -90, 8, 180);
  ctx.restore();
  ctx.restore();
}

function drawOverlay(ctx, title, sub) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 24, 0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd97a';
  ctx.font = 'bold 54px Verdana, sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Verdana, sans-serif';
  ctx.fillText(sub, W / 2, H / 2 + 36);
  ctx.restore();
}

function drawTitle(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd97a';
  ctx.font = 'bold 64px Verdana, sans-serif';
  ctx.fillText('RIDGELINE COURIER', W / 2, 170);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Verdana, sans-serif';
  ctx.fillText('Fly the Kestrel-9 across the valley. Three parcels. Two airstrips. One valley.', W / 2, 214);
  ctx.font = '18px Verdana, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  const lines = [
    '↑ ↓  pitch      ← →  bank and turn      W / S  throttle',
    'SPACE  flaps (slow down to land)      G  landing gear      1 / 2 / 3  camera',
    'Fly through the gold rings, land gently on the runway, watch your fuel.',
    '',
    'Press ENTER or click to fly',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 300 + i * 34));
  if (Math.sin(game.time * 3) > -0.2) {
    ctx.fillStyle = '#ffd97a';
    ctx.font = 'bold 24px Verdana, sans-serif';
    ctx.fillText('— PRESS ENTER —', W / 2, 540);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- loop

let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

if (shot >= 1 && shot <= 4) applyShot(shot);
requestAnimationFrame(frame);
