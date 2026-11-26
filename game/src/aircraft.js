// Coral Sky Run — the Luma-9 "Kakatua" seaplane, built from primitives.
// One clear job: the aircraft mesh, its propeller, lights and the lit
// cockpit panel the pilot sees from the cockpit camera.
import { COLORS } from "./config.js";

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

export function makeGaugePanelTexture() {  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 150;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#101c26";
  ctx.fillRect(0, 0, 512, 150);
  ctx.strokeStyle = "#2c4a5e";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 142);
  // Six glowing round gauges.
  const labels = ["ALT", "SPD", "HDG", "FUEL", "RPM", "OIL"];
  for (let i = 0; i < 6; i++) {
    const cx = 44 + i * 84, cy = 66, r = 32;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    g.addColorStop(0, "#1d3a4a");
    g.addColorStop(1, "#0a141c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8be0ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 3;
    const a = -Math.PI * 0.75 + (i * 0.37 + 0.2) * Math.PI * 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.stroke();
    ctx.fillStyle = "#9fd8ff"; ctx.font = "bold 13px Verdana";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], cx, cy + r + 20);
  }
  // Two amber warning lamps, lit.
  for (const x of [470, 494]) {
    ctx.fillStyle = "#ffb02e";
    ctx.beginPath(); ctx.arc(x, 22, 7, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildAircraft() {
  const plane = new THREE.Group();
  const cream = lambert(COLORS.planeCream);
  const teal = lambert(COLORS.planeTeal);
  const orange = lambert(COLORS.planeOrange);
  const dark = lambert(0x22303a);
  // Nearly invisible from the pilot's seat: thin glass, no depth write.
  const glassMat = new THREE.MeshPhongMaterial({
    color: 0xbfd9e8, shininess: 60, transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide,
  });

  // Fuselage: tapered body + rounded nose.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.62, 7.6, 14), cream);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.4;
  plane.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 12), cream);
  nose.scale.set(1, 1, 1.15);
  nose.position.z = 4.2;
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.6, 12), cream);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.z = -4.9;
  plane.add(tailCone);

  // Teal cheatline stripe along the fuselage.
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 0.66, 7.4, 14, 1, true, 0, Math.PI), teal);
  stripe.rotation.x = Math.PI / 2;
  stripe.rotation.z = Math.PI;
  stripe.position.set(0, 0.12, 0.4);
  stripe.scale.set(1, 1, 1);
  plane.add(stripe);

  // Cockpit glass canopy.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), glassMat);
  canopy.scale.set(0.92, 0.72, 1.7);
  canopy.position.set(0, 0.72, 1.9);
  plane.add(canopy);

  // High wing with orange tips, plus struts.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.22, 2.3), cream);
  wing.position.set(0, 0.95, 0.6);
  plane.add(wing);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 2.3), orange);
    tip.position.set(s * 6.15, 0.95, 0.6);
    plane.add(tip);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), dark);
    strut.position.set(s * 2.4, 0.25, 0.6);
    strut.rotation.z = s * 0.5;
    plane.add(strut);
  }

  // Tail: horizontal stabiliser + vertical fin with the Luma sun logo.
  const stab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 1.3), cream);
  stab.position.set(0, 0.35, -5.4);
  plane.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 1.7), teal);
  fin.position.set(0, 1.15, -5.5);
  fin.rotation.x = -0.25;
  plane.add(fin);
  const finMark = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0xffc93c }));
  finMark.position.set(0.11, 1.3, -5.55);
  finMark.rotation.y = Math.PI / 2;
  plane.add(finMark);

  // Twin floats (she is a seaplane) with spreader bars.
  for (const s of [-1, 1]) {
    const float = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 4.6, 10), orange);
    float.rotation.x = Math.PI / 2;
    float.position.set(s * 1.9, -1.25, 0.4);
    plane.add(float);
    const floatNose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), orange);
    floatNose.position.set(s * 1.9, -1.25, 2.7);
    plane.add(floatNose);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.0, 6), dark);
    bar.position.set(s * 1.1, -0.75, 0.4);
    bar.rotation.z = Math.PI / 2;
    plane.add(bar);
  }

  // Propeller: spinner + two blades + a translucent disc.
  const prop = new THREE.Group();
  const bladeMats = [];
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 12), orange);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.5;
  prop.add(spinner);
  for (const a of [0, Math.PI]) {
    // Semi-transparent blades: from the cockpit the prop reads as a blur,
    // not a solid black bar frozen mid-spin.
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0x22303a, transparent: true, opacity: 0.55 });
    bladeMats.push(bladeMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.08), bladeMat);
    blade.rotation.z = a;
    prop.add(blade);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  prop.add(disc);
  prop.position.z = 5.0;
  plane.add(prop);

  // Navigation lights: red port, green starboard, white tail.
  const nav = [];
  const mkLight = (color, x, y, z) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color }));
    l.position.set(x, y, z);
    plane.add(l);
    nav.push(l);
    return l;
  };
  mkLight(0xff2a2a, -6.7, 0.95, 0.6);
  mkLight(0x2aff5a, 6.7, 0.95, 0.6);
  mkLight(0xffffff, 0, 0.5, -6.2);

  // Cockpit dashboard: a curved panel with glowing gauges, only really
  // visible from the cockpit camera — the "instruments lit" of the brief.
  const panelTex = makeGaugePanelTexture();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.0, 0.12),
    new THREE.MeshBasicMaterial({ map: panelTex })
  );
  panel.position.set(0, 0.28, 3.55);
  panel.rotation.x = -0.28;
  plane.add(panel);
  const panelGlow = new THREE.PointLight(0x66c2ff, 6, 6, 1.6);
  panelGlow.position.set(0, 0.9, 3.2);
  plane.add(panelGlow);

  plane.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; }
  });
  panel.castShadow = false;
  disc.castShadow = false;

  return { group: plane, prop, navLights: nav, canopy, bladeMats };
}
