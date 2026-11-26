// Coral Sky Run — the game itself: renderer, cameras, states, scoring.
// One clear job: wire terrain + aircraft + flight + rings + HUD + sound
// into a playable loop, and offer deterministic ?shot= setups for the
// maker's screenshots.
import { COLORS, FLIGHT, RINGS, RUNWAY, SHOT_PRESETS, SPAWN, WORLD } from "./config.js";
import { buildTerrain } from "./terrain.js";
import { buildAircraft, makeGaugePanelTexture } from "./aircraft.js";
import { FlightModel } from "./flight.js";
import { RingCourse } from "./rings.js";
import { Hud } from "./hud.js";
import { Input } from "./input.js";
import { SoundBank } from "./audio.js";

const params = new URLSearchParams(location.search);
const shotName = params.get("shot");
const shot = shotName ? SHOT_PRESETS[shotName] : null;

const app = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.className = "webgl";
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);
camera.position.set(SPAWN.x - 20, SPAWN.y + 30, SPAWN.z + 60);
scene.add(camera);

// Warm fill light that rides with the camera so the aeroplane's shadow
// side never reads black in chase view.
const fillLight = new THREE.DirectionalLight(0xfff0d8, 0.9);
scene.add(fillLight);
scene.add(fillLight.target);

// Lit cockpit dashboard, parented to the camera so it always sits at the
// bottom of the pilot's view — the "instruments lit" of the brief.
const dash = new THREE.Group();
const dashPanel = new THREE.Mesh(
  new THREE.BoxGeometry(1.7, 0.5, 0.06),
  new THREE.MeshBasicMaterial({ map: makeGaugePanelTexture() })
);
dashPanel.position.set(0, -0.46, -1.25);
dashPanel.rotation.x = -0.12;
dash.add(dashPanel);
const dashCoaming = new THREE.Mesh(
  new THREE.BoxGeometry(1.76, 0.07, 0.08),
  new THREE.MeshLambertMaterial({ color: 0x1a2833 })
);
dashCoaming.position.set(0, -0.19, -1.25);
dashCoaming.rotation.x = -0.12;
dash.add(dashCoaming);
dash.visible = false;
camera.add(dash);

const terrain = buildTerrain(scene);
const { group: plane, prop, canopy, bladeMats } = buildAircraft();
scene.add(plane);
const rings = new RingCourse(scene);
const hud = new Hud();
const input = new Input();
const sound = new SoundBank();
const flight = new FlightModel(SPAWN, terrain.heightAt);

let state = "menu"; // menu | flying | landed | crashed
let cameraMode = "chase";
let score = 0;
let fuel = FLIGHT.startFuel;
let elapsed = 0;
let prevPos = { x: flight.x, y: flight.y, z: flight.z };
let camPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
let camLook = new THREE.Vector3();
let lowFuelWarned = false;
let smoothLanding = false;
let tGlobal = 0;

function placePlaneAt(x, y, z, headingDeg, speed) {
  flight.x = x; flight.y = y; flight.z = z;
  flight.heading = (headingDeg * Math.PI) / 180;
  flight.pitch = 0; flight.roll = 0;
  flight.speed = speed;
  flight.throttle = 0.62;
  flight.onGround = false; flight.onWater = false;
  flight.airTime = 10;
  prevPos = { x, y, z };
}

function applyShotPreset() {
  if (shotName === "landing") {
    // Final approach to the Luma runway: all rings flown, on the glidepath.
    for (const r of rings.rings) r.userData.passed = true;
    rings.passed = RINGS.length;
    rings.nextIndex = RINGS.length;
    rings.updateColors();
    score = RINGS.length * FLIGHT.ringScore;
    const rad = (RUNWAY.headingDeg * Math.PI) / 180;
    const dx = Math.sin(rad), dz = -Math.cos(rad);
    placePlaneAt(
      RUNWAY.x - dx * 380, RUNWAY.elevation + 110, RUNWAY.z - dz * 380,
      RUNWAY.headingDeg, 46
    );
    cameraMode = "chase";
    elapsed = 312;
    state = "flying";
    hud.hideMenu();
    return;
  }
  const ring = RINGS[shot.ring];
  const from = shot.ring === 0 ? { x: SPAWN.x, z: SPAWN.z } : RINGS[shot.ring - 1];
  const dx = ring.x - from.x, dz = ring.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  const x = ring.x - ux * shot.distBehindRing;
  const z = ring.z - uz * shot.distBehindRing;
  const headingDeg = (Math.atan2(ux, -uz) * 180) / Math.PI;
  // Mark earlier rings as already flown.
  for (let i = 0; i < shot.ring; i++) {
    rings.rings[i].userData.passed = true;
  }
  rings.passed = shot.ring;
  rings.nextIndex = shot.ring;
  rings.updateColors();
  score = shot.ring * FLIGHT.ringScore;
  placePlaneAt(x, shot.alt, z, headingDeg, shot.speed);
  cameraMode = shot.cam;
  elapsed = 42 + shot.ring * 17;
  state = "flying";
  hud.hideMenu();
}

function resetFlight() {
  flight.reset(SPAWN);
  rings.reset();
  score = 0;
  fuel = FLIGHT.startFuel;
  elapsed = 0;
  lowFuelWarned = false;
  smoothLanding = false;
  prevPos = { x: flight.x, y: flight.y, z: flight.z };
  hud.hideEnd();
  state = "flying";
}

function startGame() {
  sound.ensure();
  hud.hideMenu();
  state = "flying";
  hud.showMessage("TAKE OFF!", "Full throttle — W — then pull up gently", 3);
}

function endFlight(title, lines) {
  state = title === "LANDED!" ? "landed" : "crashed";
  hud.showEnd(title, lines);
}

function updatePlaneMesh(dt) {
  plane.position.set(flight.x, flight.y, flight.z);
  plane.rotation.order = "YXZ";
  plane.rotation.set(-flight.pitch, Math.PI - flight.heading, -flight.roll);
  prop.rotation.z += dt * (6 + flight.throttle * 42);
  // Nav-light blink.
  const blink = Math.sin(tGlobal * 4) > 0;
  plane.children.forEach(() => {});
}

function updateChaseCamera(dt) {
  const fwd = flight.forward();
  const desired = new THREE.Vector3(
    flight.x - fwd.x * 16,
    flight.y + 5.4 - flight.pitch * 5,
    flight.z - fwd.z * 16
  );
  const k = 1 - Math.exp(-dt * 4.5);
  camPos.lerp(desired, k);
  camera.position.copy(camPos);
  camLook.lerp(new THREE.Vector3(
    flight.x + fwd.x * 30, flight.y + 1 - flight.pitch * 10, flight.z + fwd.z * 30
  ), 1 - Math.exp(-dt * 7));
  camera.up.set(Math.sin(flight.roll) * 0.35, 1, 0);
  camera.lookAt(camLook);
}

function updateCockpitCamera() {
  const q = plane.quaternion;
  const head = new THREE.Vector3(0, 1.28, 3.35).applyQuaternion(q).add(plane.position);
  const ahead = new THREE.Vector3(0, 0.5, 40).applyQuaternion(q).add(plane.position);
  camera.position.copy(head);
  camera.up.set(0, 1, 0);
  camera.lookAt(ahead);
}

function autopilot(dt) {
  // Screenshot mode only: gentle auto-level and a steer toward the next ring
  // (or the runway once the rings are done) so the frame stays composed.
  const next = rings.next();
  let tx, ty, tz;
  if (next) {
    tx = next.position.x; ty = next.position.y; tz = next.position.z;
  } else {
    tx = RUNWAY.x; ty = RUNWAY.elevation + 12; tz = RUNWAY.z;
  }
  const dx = tx - flight.x, dz = tz - flight.z;
  const want = Math.atan2(dx, -dz);
  let dh = want - flight.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  const dy = ty - flight.y;
  return {
    // PD on heading error, damped by current bank; PD on altitude error,
    // damped by vertical speed, so the plane settles on the ring's height
    // instead of porpoising around it.
    roll: clamp(dh * 1.4 - flight.roll * 0.8, -1, 1),
    pitch: clamp(dy * 0.02 - flight.verticalSpeed * 0.06 - flight.pitch * 0.5, -0.8, 0.8),
    throttleUp: flight.speed < 52,
    throttleDown: flight.speed > 62,
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function tick(now) {
  requestAnimationFrame(tick);
  // Real frame time (unclamped) drives the camera smoothing so it converges
  // even at the few frames per second a software renderer gives; the
  // physics step below stays clamped for stability.
  const realDt = Math.min(1, (now - (tick.last || now)) / 1000 || 0.016);
  const dt = Math.min(0.05, realDt);
  tick.last = now;
  tGlobal += dt;
  terrain.update(dt);
  rings.update(dt, tGlobal);

  if (state === "flying") {
    elapsed += dt;
    const steer = shot ? autopilot(dt) : input.steering();
    const before = { x: flight.x, y: flight.y, z: flight.z };
    const res = flight.step(dt, steer, fuel);
    fuel = res.fuel;
    const passed = rings.checkPass(before, flight);
    if (passed) {
      score += FLIGHT.ringScore;
      fuel = Math.min(FLIGHT.fuelCapacity, fuel + FLIGHT.ringFuelBonus);
      sound.ringChime();
      const n = rings.next();
      hud.showMessage(`RING ${rings.passed} — ${passed.userData.def.name} +${FLIGHT.ringScore}`,
        n ? `Next: ${n.userData.def.name}` : "All rings clear — land on Luma runway!");
    }
    if (!lowFuelWarned && fuel < 25) {
      lowFuelWarned = true;
      hud.showMessage("LOW FUEL", "Land soon — the runway is home", 3);
    }
    if (flight.landed) {
      smoothLanding = Math.abs(flight.verticalSpeed) < 2.5 && flight.speed < 30;
      const timeBonus = Math.max(0, 300 - Math.floor(elapsed / 2));
      const fuelBonus = Math.round(fuel * 2);
      score += FLIGHT.landingScore + (smoothLanding ? FLIGHT.smoothLandingBonus : 0)
        + timeBonus + fuelBonus;
      sound.touchdown();
      endFlight("LANDED!", [
        `Score: <b>${score.toLocaleString("en-US")} pts</b>`,
        `Rings: ${rings.passed} / ${RINGS.length} &nbsp;•&nbsp; Time: ${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`,
        `Landing: ${smoothLanding ? "smooth as silk" : "a bit firm"} (+${FLIGHT.landingScore}${smoothLanding ? ` + ${FLIGHT.smoothLandingBonus} smooth` : ""})`,
        `Time bonus +${timeBonus} &nbsp;•&nbsp; Fuel bonus +${fuelBonus}`,
      ]);
    } else if (flight.crashed) {
      sound.crashThud();
      endFlight("CRASHED", [
        `${flight.crashReason}`,
        `Score: <b>${score.toLocaleString("en-US")} pts</b> — rings ${rings.passed} / ${RINGS.length}`,
        `Press R to fly again`,
      ]);
    }
    // Camera keys.
    if (input.wasPressed("c")) cameraMode = cameraMode === "chase" ? "cockpit" : "chase";
    if (input.wasPressed("r")) resetFlight();
    if (input.wasPressed("m")) {
      const muted = sound.toggleMute();
      hud.showMessage(muted ? "SOUND OFF" : "SOUND ON", "", 1.2);
    }
    if (input.wasPressed("g")) {
      flight.gearDown = !flight.gearDown;
      hud.showMessage(flight.gearDown ? "GEAR DOWN" : "GEAR UP", "", 1.2);
    }
    sound.setEngine(flight.throttle, flight.speed / FLIGHT.maxSpeed, !flight.onGround);
  } else if (state === "menu") {
    // Slow cinematic orbit around the parked plane for the menu backdrop.
    const a = tGlobal * 0.08;
    camera.position.set(
      flight.x + Math.sin(a) * 26, flight.y + 9 + Math.sin(tGlobal * 0.3) * 1.5,
      flight.z + Math.cos(a) * 26
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(flight.x, flight.y + 1, flight.z);
    if (input.wasPressed("enter") || input.wasPressed(" ")) startGame();
  } else {
    // Landed / crashed: hold the last camera, slow drift.
    if (input.wasPressed("r")) resetFlight();
  }

  updatePlaneMesh(dt);
  if (state !== "menu") {
    if (cameraMode === "cockpit") updateCockpitCamera();
    else updateChaseCamera(realDt);
  }
  // Fill light rides with the camera; dashboard only in cockpit view, and
  // the canopy glass hides there too — from the pilot's seat it would only
  // smear a dark dome across the windscreen.
  fillLight.position.copy(camera.position).add(new THREE.Vector3(0, 60, 0));
  fillLight.target.position.copy(plane.position);
  dash.visible = cameraMode === "cockpit" && state === "flying";
  canopy.visible = cameraMode !== "cockpit";
  // In the cockpit the blades sit 1.6 m from the pilot's eyes: nearly
  // invisible there, solid again in chase view.
  for (const m of bladeMats) m.opacity = cameraMode === "cockpit" ? 0.07 : 0.55;
  hud.update(dt, flight, {
    score,
    ringsPassed: rings.passed,
    elapsed,
    fuel,
    nextRing: rings.next(),
    distToRing: rings.distanceToNext(flight) ?? 0,
  });
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("again-btn").addEventListener("click", () => {
  hud.hideEnd();
  resetFlight();
});

if (shot) applyShotPreset();
window.__coral = { plane, camera, flight, rings, terrain };
requestAnimationFrame(tick);
