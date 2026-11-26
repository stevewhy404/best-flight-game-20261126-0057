// Ridgeline Courier — flight model: arcade lift, drag, stall, turns, landings.

import { clamp, approach } from './util.js';

export const STALL_SPEED = 26; // m/s: below this the wing stops flying
export const MAX_SPEED = 92; // m/s at full throttle, level flight
export const TAKEOFF_SPEED = 30;

/** A fresh plane sitting on the given strip, engine idling. */
export function makePlane(strip) {
  return {
    x: strip.x0 + 40,
    alt: 30, // ground level at the strip
    speed: 0,
    pitch: 0, // radians, + climbs
    heading: strip.dir > 0 ? 0 : Math.PI, // 0 = east, PI = west
    throttle: 0,
    fuel: 100,
    damage: 0,
    gear: true,
    flaps: false,
    onGround: true,
    airborneFor: 0, // seconds since leaving the ground (takeoff grace)
    bank: 0, // visual bank angle, radians
    propAngle: 0,
    crashed: false,
    crashReason: '',
    landed: false,
    dust: 0,
  };
}

/**
 * One physics tick. `input` is {pitch: -1..1, bank: -1..1, throttle: -1..1,
 * flaps, gear}. Mutates and returns the plane. `world` supplies heightAt().
 */
export function stepFlight(plane, input, dt, world) {
  if (plane.crashed) return plane;
  const ground = world.heightAt(plane.x);

  // Throttle responds a little slowly, like a real engine spooling.
  plane.throttle = clamp(plane.throttle + input.throttle * dt * 0.9, 0, 1);
  plane.propAngle += (6 + plane.throttle * 42) * dt;

  // Pitch follows the stick, quicker in the air than on the ground.
  const pitchRate = plane.onGround ? 0.35 : 0.85;
  plane.pitch = clamp(plane.pitch + input.pitch * pitchRate * dt, -0.55, 0.55);

  // Banking turns the heading; a hard bank bleeds speed (turn discipline).
  const turnRate = input.bank * 0.55 * clamp(plane.speed / 40, 0.25, 1);
  plane.heading += turnRate * dt;
  plane.bank = approach(plane.bank, input.bank * 0.55, dt * 2.4);
  const turnBleed = Math.abs(turnRate) * plane.speed * 0.35;

  // Thrust vs drag: level speed settles near throttle * MAX_SPEED.
  const thrust = plane.throttle * 46;
  const drag = 0.011 * plane.speed * plane.speed + (plane.flaps ? 7 : 0) + (plane.gear && !plane.onGround ? 3 : 0);
  plane.speed += (thrust - drag - turnBleed) * dt;
  plane.speed = clamp(plane.speed, 0, 110);

  // Lift: climbing costs speed, descending gives it back; below stall the
  // wing quits and the plane sinks.
  const liftFactor = plane.speed >= STALL_SPEED ? 1 : plane.speed / STALL_SPEED;
  let vy = plane.speed * Math.sin(plane.pitch) * liftFactor;
  if (plane.speed < STALL_SPEED && !plane.onGround) vy -= (STALL_SPEED - plane.speed) * 0.55;
  if (plane.onGround) vy = Math.max(0, vy);

  const dirX = Math.cos(plane.heading); // +1 east, -1 west
  const forward = Math.abs(dirX);
  plane.x += plane.speed * Math.cos(plane.pitch) * dirX * dt;
  plane.alt += vy * dt;

  // Fuel burns with throttle; a dead tank glides you down.
  plane.fuel = Math.max(0, plane.fuel - plane.throttle * 0.55 * dt);
  if (plane.fuel <= 0 && plane.throttle > 0.15) plane.throttle = approach(plane.throttle, 0.12, dt * 0.5);

  // Takeoff: fast enough and pitched up, the wheels leave the ground.
  if (plane.onGround && plane.speed > TAKEOFF_SPEED && plane.pitch > 0.04) {
    plane.onGround = false;
    plane.airborneFor = 0;
    plane.dust = 0;
  }
  if (plane.onGround) {
    plane.alt = ground;
    plane.airborneFor = 0;
    // Rotation: the pilot holds the nose up during the roll; only ease the
    // pitch back to level once the plane is nearly stopped.
    if (plane.speed < 5) plane.pitch = approach(plane.pitch, 0, dt * 2);
    if (plane.speed > 12) plane.dust = Math.min(1, plane.dust + dt * 2);
    else plane.dust = Math.max(0, plane.dust - dt * 3);
    // Rolling off the strip fast ends in rough ground, not a free taxiway.
    const onStrip = world.strips.some((s) => plane.x >= s.x0 - 20 && plane.x <= s.x1 + 20);
    if (!onStrip && plane.speed > 30) {
      plane.crashed = true;
      plane.crashReason = 'Ran off the runway into rough ground';
    }
  }

  // World edges: turn the plane gently back instead of letting it leave.
  if (plane.x < 40) {
    plane.x = 40;
    plane.heading = 0;
  }
  if (plane.x > 5760) {
    plane.x = 5760;
    plane.heading = Math.PI;
  }
  if (plane.alt > 420) {
    plane.alt = 420;
    plane.pitch = Math.min(plane.pitch, 0);
  }

  // Ground contact (only once properly airborne: the takeoff tick itself
  // still has the wheels on the ground line and must not count as a landing).
  if (!plane.onGround) plane.airborneFor += dt;
  if (!plane.onGround && plane.airborneFor > 0.4 && plane.alt <= ground + 0.4) {
    const strip = world.strips.find((s) => plane.x >= s.x0 && plane.x <= s.x1);
    const river = Math.abs(plane.x - world.riverX) < 62;
    const verticalSpeed = -vy;
    if (river) {
      plane.crashed = true;
      plane.crashReason = 'Ditched in the river';
    } else if (strip && plane.gear && verticalSpeed < 4.5 && plane.speed < 52 && Math.abs(plane.pitch) < 0.3) {
      plane.onGround = true;
      plane.landed = true;
      plane.alt = ground;
      plane.pitch = 0;
      if (verticalSpeed > 2.5) plane.damage = Math.min(100, plane.damage + 14);
    } else if (strip && plane.gear && verticalSpeed < 7 && plane.speed < 60) {
      // Hard landing: survives, but the airframe remembers it.
      plane.onGround = true;
      plane.landed = true;
      plane.alt = ground;
      plane.pitch = 0;
      plane.damage = Math.min(100, plane.damage + 30);
    } else {
      plane.crashed = true;
      plane.crashReason = strip ? 'Crashed on the runway' : 'Flew into the hillside';
    }
    if (plane.damage >= 100) {
      plane.crashed = true;
      plane.crashReason = 'Airframe gave out';
    }
  }
  return plane;
}

/** Heading shown on the compass: 090 east, 270 west, turning in between.
 *  The flight model measures 0 as east, so compass degrees add 90. */
export function headingDegrees(plane) {
  let deg = (plane.heading * 180) / Math.PI + 90;
  deg = ((deg % 360) + 360) % 360;
  return Math.round(deg);
}
