// Coral Sky Run — arcade flight model for the Luma-9.
// One clear job: turn throttle / pitch / roll input into a believable
// aeroplane: lift that needs airspeed, banking that turns, stalls, and
// ground / water handling for take-off and landing.
import { FLIGHT, RUNWAY, WORLD } from "./config.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class FlightModel {
  constructor(spawn, heightAt) {
    this.heightAt = heightAt;
    this.reset(spawn);
  }

  reset(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.heading = (spawn.headingDeg * Math.PI) / 180; // 0 = north (-Z)
    this.pitch = 0;
    this.roll = 0;
    this.speed = spawn.speed;
    this.throttle = 0;
    this.verticalSpeed = 0;
    this.gearDown = true;
    this.onGround = true;
    this.onWater = false;
    this.stalled = false;
    this.crashed = false;
    this.landed = false;
    this.crashReason = "";
    this.airTime = 0;
  }

  get speedKnots() { return this.speed * 1.944; }
  get altitudeFt() { return Math.max(0, (this.y - this.heightAt(this.x, this.z)) * 3.281); }
  get headingDeg() { return ((this.heading * 180) / Math.PI % 360 + 360) % 360; }

  forward() {
    return { x: Math.sin(this.heading), z: -Math.cos(this.heading) };
  }

  onRunway() {
    const rad = (RUNWAY.headingDeg * Math.PI) / 180;
    const dx = this.x - RUNWAY.x, dz = this.z - RUNWAY.z;
    const along = dx * Math.sin(rad) + dz * -Math.cos(rad);
    const across = dx * Math.cos(rad) + dz * Math.sin(rad);
    return Math.abs(along) < RUNWAY.length / 2 + 40 && Math.abs(across) < RUNWAY.width / 2 + 14;
  }

  step(dt, input, fuel) {
    if (this.crashed || this.landed) return { fuel };

    // Throttle: W/S keys, clamped 0..1, with a gentle spool.
    const target = clamp(this.throttle + (input.throttleUp ? dt * 0.7 : 0)
      - (input.throttleDown ? dt * 0.9 : 0), 0, 1);
    this.throttle = lerp(this.throttle, target, Math.min(1, dt * 6));
    fuel -= this.throttle * FLIGHT.fuelBurnCruise * dt;
    if (fuel <= 0) { fuel = 0; this.throttle = Math.min(this.throttle, 0.12); }

    const fwd = this.forward();
    const airborne = !this.onGround && !this.onWater;

    if (airborne) {
      // Roll toward the commanded bank, then turn from the bank: banking
      // right (positive roll) turns right (heading grows, clockwise).
      const rollTarget = clamp(input.roll * 0.85, -0.85, 0.85);
      this.roll = lerp(this.roll, rollTarget, Math.min(1, dt * 3.2));
      this.heading += this.roll * FLIGHT.turnFromRoll * dt * (0.5 + this.speed / FLIGHT.cruiseSpeed);
      // Pitch toward the commanded climb/descent.
      const pitchTarget = clamp(input.pitch * 0.42, -0.42, 0.42);
      this.pitch = lerp(this.pitch, pitchTarget, Math.min(1, dt * 2.4));
      // Speed: throttle pushes, drag pulls, climbing costs speed.
      const accel = this.throttle * FLIGHT.accelPerThrottle
        - FLIGHT.drag * this.speed * this.speed * 0.055
        - Math.sin(this.pitch) * FLIGHT.gravity * 0.9;
      this.speed = clamp(this.speed + accel * dt, 0, FLIGHT.maxSpeed);
      // Lift: climbing needs airspeed; below min speed the wing stalls.
      this.stalled = this.speed < FLIGHT.minSpeed;
      const lift = this.stalled
        ? -FLIGHT.gravity * 0.55
        : Math.sin(this.pitch) * this.speed * FLIGHT.liftFactor
          + (this.speed - FLIGHT.minSpeed) * 0.045;
      this.verticalSpeed = lerp(this.verticalSpeed, lift, Math.min(1, dt * 2.2));
      this.y += this.verticalSpeed * dt;
      this.x += fwd.x * this.speed * Math.cos(this.pitch) * dt;
      this.z += fwd.z * this.speed * Math.cos(this.pitch) * dt;
      this.airTime += dt;
    } else {
      // Rolling on ground or floating: steer gently, build speed.
      this.roll = lerp(this.roll, input.roll * 0.25, Math.min(1, dt * 3));
      this.heading += this.roll * 0.35 * dt * (this.speed / 40);
      const accel = this.throttle * FLIGHT.accelPerThrottle
        - (this.onWater ? 3.2 : 1.1) - FLIGHT.drag * this.speed * 0.4;
      this.speed = clamp(this.speed + accel * dt, 0, FLIGHT.maxSpeed);
      this.x += fwd.x * this.speed * dt;
      this.z += fwd.z * this.speed * dt;
      this.pitch = lerp(this.pitch, input.pitch * 0.1, Math.min(1, dt * 3));
      // Rotate for take-off once fast enough and pulling up.
      if (this.speed > FLIGHT.minSpeed + 4 && input.pitch > 0.25) {
        this.onGround = false; this.onWater = false;
        this.y += 0.6; this.verticalSpeed = 2;
      }
    }

    // World bounds: soft push back toward the archipelago.
    const lim = WORLD.size / 2;
    if (Math.abs(this.x) > lim || Math.abs(this.z) > lim) {
      this.heading += Math.PI * dt * 0.5;
    }
    this.y = Math.min(this.y, WORLD.skyTop);

    // Ground / water contact.
    const ground = this.heightAt(this.x, this.z);
    const minY = ground + 2.2;
    if (this.y <= minY) {
      const overWater = ground < 1.5;
      const vs = Math.abs(this.verticalSpeed);
      const sink = this.y;
      this.y = minY;
      if (overWater) {
        if (vs < 4 && this.speed < 34) {
          // Gentle splash-down: the floats hold her.
          this.onWater = true; this.onGround = false;
          this.verticalSpeed = 0; this.pitch = 0;
        } else {
          this.crashed = true; this.crashReason = "Ditched hard in the sea";
        }
      } else if (this.onRunway()) {
        if (vs < 4.5 && this.speed < 46) {
          // On the strip, slow and gentle: a landing.
          if (this.airTime > 8) { this.landed = true; }
          this.onGround = true;
          this.verticalSpeed = 0; this.pitch = 0;
        } else {
          this.crashed = true;
          this.crashReason = vs >= 4.5 ? "Slammed into the runway" : "Ran off the runway too fast";
        }
      } else {
        // Dry land that is not the runway.
        if (vs < 3 && this.speed < 22 && this.airTime > 8) {
          this.onGround = true; this.verticalSpeed = 0; this.pitch = 0;
        } else {
          this.crashed = true; this.crashReason = "Crashed into the island";
        }
      }
      if (this.crashed) this.y = sink;
    }
    return { fuel };
  }
}
