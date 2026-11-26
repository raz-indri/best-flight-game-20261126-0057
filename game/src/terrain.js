// Coral Sky Run — terrain, sea, sky, clouds and the home airfield.
// Builds the whole Luma archipelago from one seeded height function so the
// flight model, the renderer and the screenshots all agree on the ground.
import { COLORS, RUNWAY, WORLD } from "./config.js";

const ISLANDS = [
  { x: -1150, z: 950, r: 780, h: 120, volcano: false }, // Pulau Luma (home)
  { x: -420, z: -120, r: 520, h: 95, volcano: false },
  { x: 120, z: -560, r: 460, h: 80, volcano: false },
  { x: 780, z: -720, r: 620, h: 340, volcano: true }, // Gunung Api
  { x: 1180, z: -60, r: 430, h: 70, volcano: false },
  { x: 900, z: 620, r: 380, h: 60, volcano: false },
  { x: 240, z: 980, r: 420, h: 85, volcano: false },
  { x: -760, z: 1080, r: 360, h: 55, volcano: false },
  { x: -1650, z: -700, r: 420, h: 90, volcano: false },
  { x: 1650, z: 900, r: 480, h: 75, volcano: false },
  { x: 300, z: 1650, r: 380, h: 65, volcano: false },
  { x: -300, z: -1500, r: 500, h: 110, volcano: false },
];

// Deterministic 2D value noise (seeded hash, no Math.random in the field).
function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return (((n ^ (n >> 16)) >>> 0) % 100000) / 100000;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const u = smooth(fx), v = smooth(fz);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function heightAt(x, z) {
  let h = -14; // sea floor baseline
  for (const isl of ISLANDS) {
    const dx = x - isl.x, dz = z - isl.z;
    const d = Math.sqrt(dx * dx + dz * dz) / isl.r;
    if (d >= 1.6) continue;
    const fall = Math.exp(-d * d * 2.4);
    let peak = isl.h * fall;
    if (isl.volcano) {
      // Steep cone with a crater bowl on top.
      const cone = Math.max(0, 1 - d * 1.15);
      peak = isl.h * cone * cone;
      if (d < 0.16) peak -= 42 * (1 - d / 0.16);
    }
    h = Math.max(h, peak);
  }
  // Gentle rolling detail on land only, fading out near the shore so the
  // beaches stay clean sand instead of speckled lowland.
  if (h > 2) {
    const k = Math.min(1, Math.max(0, (h - 2) / 18));
    h += (noise2(x * 0.012, z * 0.012) - 0.5) * 9 * k
       + (noise2(x * 0.045 + 7, z * 0.045 + 3) - 0.5) * 3.5 * k;
  }
  // The home airfield is a flat plateau: blend the island down to the
  // runway elevation inside 420 m, fading out by 700 m, so the strip and
  // both approaches sit in the open instead of inside the hillside.
  const rdx = x - RUNWAY.x, rdz = z - RUNWAY.z;
  const rd = Math.sqrt(rdx * rdx + rdz * rdz);
  if (rd < 700) {
    const t = Math.min(1, Math.max(0, (700 - rd) / 280));
    const blend = t * t * (3 - 2 * t);
    h = h + (RUNWAY.elevation - h) * blend;
  }
  return h;
}

function colorForHeight(h, slope, out) {
  if (h < 2) return out.setHex(COLORS.sand);
  if (h < 4) return out.setHex(COLORS.grass);
  if (h < 30) {
    // Grass, with forest patches from the noise field.
    const f = noise2(h * 0.31 + 11, h * 0.17 + 5);
    return out.setHex(f > 0.55 ? COLORS.forest : COLORS.grass);
  }
  if (h < 90) {
    // High ground stays green unless it is genuinely steep.
    return out.setHex(slope > 0.85 ? COLORS.rock : COLORS.grass);
  }
  if (h > 250) return out.setHex(COLORS.volcanoTop);
  return out.setHex(COLORS.rock);
}

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(4800, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(COLORS.skyTop) },
      mid: { value: new THREE.Color(0x7cc0e8) },
      bot: { value: new THREE.Color(COLORS.skyHorizon) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){ float h = normalize(vP).y;
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.85, h))
                          : mix(bot, mid, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  scene.add(sky);
  // Sun disc with a soft halo.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, fog: false })
  );
  sun.position.set(-2600, 1500, -3600);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(320, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.22, fog: false })
  );
  halo.position.copy(sun.position).multiplyScalar(1.001);
  halo.lookAt(0, 0, 0);
  scene.add(halo);
}

function buildSea(scene) {
  const geo = new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4, 96, 96);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: { value: 0 },
      deep: { value: new THREE.Color(COLORS.seaDeep) },
      shallow: { value: new THREE.Color(COLORS.seaShallow) },
      sunDir: { value: new THREE.Vector3(-0.45, 0.62, -0.63).normalize() },
    },
    vertexShader: `uniform float time; varying vec3 vN; varying vec3 vW;
      float waveH(vec2 p, float t){
        return sin(p.x * 0.021 + t * 1.1) * 0.9 + sin(p.y * 0.017 - t * 0.8) * 0.9
             + sin((p.x + p.y) * 0.008 + t * 0.5) * 1.4; }
      void main(){ vec3 p = position;
        float e = 6.0;
        float h = waveH(p.xy, time);
        float hx = waveH(p.xy + vec2(e, 0.0), time);
        float hy = waveH(p.xy + vec2(0.0, e), time);
        p.z += h;
        // Analytic wave normal, transformed to world space (the mesh is
        // rotated flat, so local +Z is world up).
        vN = normalize(mat3(modelMatrix) * vec3(-(hx - h) / e, -(hy - h) / e, 1.0));
        vW = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 deep; uniform vec3 shallow; uniform vec3 sunDir;
      varying vec3 vN; varying vec3 vW;
      void main(){ vec3 n = normalize(vN);
        vec3 view = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, view), 0.0), 2.0);
        vec3 col = mix(deep, shallow, fres * 0.7 + 0.14);
        float glint = pow(max(dot(reflect(-sunDir, n), view), 0.0), 120.0);
        col += vec3(1.0, 0.95, 0.75) * glint * 0.8;
        // Manual fog (ShaderMaterial ignores scene fog): melt the far sea
        // into the horizon so no hard plane edge shows.
        float fogF = smoothstep(900.0, 4200.0, distance(cameraPosition, vW));
        col = mix(col, vec3(0.81, 0.91, 0.96), fogF);
        gl_FragColor = vec4(col, 0.92); }`,
  });
  const sea = new THREE.Mesh(geo, mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WORLD.seaLevel;
  scene.add(sea);
  return mat;
}

function buildGround(scene) {
  const seg = 180;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    // Slope from a small forward sample, for rock colouring.
    const slope = Math.abs(heightAt(x + 14, z) - h) / 14;
    colorForHeight(h, slope, c);
    // Slight tonal jitter so the ground never looks flat-shaded.
    const j = 0.92 + noise2(x * 0.11, z * 0.11) * 0.16;
    colors[i * 3] = c.r * j; colors[i * 3 + 1] = c.g * j; colors[i * 3 + 2] = c.b * j;
    tmp.set(x, h, z);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

function buildClouds(scene) {
  const group = new THREE.Group();
  // Lambert with a strong emissive so the shaded side never reads as a dark blob.
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff, emissive: 0x8f9aa2, transparent: true, opacity: 0.92,
  });
  const puffs = [];
  for (let i = 0; i < 26; i++) {
    const cloud = new THREE.Group();
    const n = 3 + Math.floor(hash2(i, 7) * 3);
    for (let j = 0; j < n; j++) {
      const r = 26 + hash2(i, j) * 42;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
      puff.position.set((hash2(i, j + 20) - 0.5) * 130, (hash2(i, j + 40) - 0.5) * 14, (hash2(i, j + 60) - 0.5) * 70);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set((hash2(i, 3) - 0.5) * WORLD.size * 1.1,
      380 + hash2(i, 5) * 320, (hash2(i, 9) - 0.5) * WORLD.size * 1.1);
    cloud.userData.drift = 2.5 + hash2(i, 11) * 3.5;
    group.add(cloud);
    puffs.push(cloud);
  }
  scene.add(group);
  return puffs;
}

function buildRunway(scene) {
  const g = new THREE.Group();
  const rad = (RUNWAY.headingDeg * Math.PI) / 180;
  const dirX = Math.sin(rad), dirZ = -Math.cos(rad); // runway forward (north-ish)
  const perpX = Math.cos(rad), perpZ = Math.sin(rad);
  const baseY = RUNWAY.elevation;
  const groundY = heightAt(RUNWAY.x, RUNWAY.z);

  // Flattened pad under the strip so it never clips the hillside.
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.length + 90, 6, RUNWAY.width + 90),
    new THREE.MeshLambertMaterial({ color: COLORS.grass })
  );
  pad.position.set(RUNWAY.x, baseY - 3.4, RUNWAY.z);
  pad.rotation.y = rad;
  pad.receiveShadow = true;
  g.add(pad);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.length, 1.2, RUNWAY.width),
    new THREE.MeshLambertMaterial({ color: COLORS.runway })
  );
  strip.position.set(RUNWAY.x, baseY + 0.2, RUNWAY.z);
  strip.rotation.y = rad;
  strip.receiveShadow = true;
  g.add(strip);

  // Centreline dashes and threshold bars.
  const markMat = new THREE.MeshBasicMaterial({ color: 0xf8f8f2 });
  for (let d = -RUNWAY.length / 2 + 40; d < RUNWAY.length / 2 - 30; d += 46) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.4), markMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = -rad;
    dash.position.set(RUNWAY.x + dirX * d, baseY + 0.85, RUNWAY.z + dirZ * d);
    g.add(dash);
  }
  for (const end of [-1, 1]) {
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), markMat);
      bar.rotation.x = -Math.PI / 2;
      bar.rotation.z = -rad;
      const along = end * (RUNWAY.length / 2 - 14);
      const across = k * 7;
      bar.position.set(RUNWAY.x + dirX * along + perpX * across,
        baseY + 0.85, RUNWAY.z + dirZ * along + perpZ * across);
      g.add(bar);
    }
  }
  // Edge lights (warm, emissive) and a windsock.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffc93c });
  for (let d = -RUNWAY.length / 2 + 12; d <= RUNWAY.length / 2 - 12; d += 52) {
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), lightMat);
      lamp.position.set(RUNWAY.x + dirX * d + perpX * s * (RUNWAY.width / 2 + 3),
        baseY + 1.6, RUNWAY.z + dirZ * d + perpZ * s * (RUNWAY.width / 2 + 3));
      g.add(lamp);
    }
  }
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 14, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })
  );
  pole.position.set(RUNWAY.x + perpX * (RUNWAY.width / 2 + 26), baseY + 7, RUNWAY.z + perpZ * (RUNWAY.width / 2 + 26));
  g.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 9, 10),
    new THREE.MeshLambertMaterial({ color: 0xff7a2e })
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(pole.position.x + 4.5, baseY + 12.5, pole.position.z);
  g.add(sock);
  g.userData.sock = sock;

  // Little hangar and two houses beside the strip.
  const hangar = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 24),
    new THREE.MeshLambertMaterial({ color: 0xe8e2d2 }));
  walls.position.y = 6;
  hangar.add(walls);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 34, 12, 1, false, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: COLORS.planeTeal }));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 12;
  hangar.add(roof);
  hangar.position.set(RUNWAY.x - perpX * 90, baseY, RUNWAY.z - perpZ * 90);
  hangar.rotation.y = rad;
  g.add(hangar);

  const houseMat = new THREE.MeshLambertMaterial({ color: 0xfff3d6 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xc2503a });
  [[-60, 60], [-95, 30]].forEach(([a, b]) => {
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 12), houseMat);
    body.position.y = 4;
    house.add(body);
    const hr = new THREE.Mesh(new THREE.ConeGeometry(11, 6, 4), roofMat);
    hr.position.y = 11;
    hr.rotation.y = Math.PI / 4;
    house.add(hr);
    house.position.set(RUNWAY.x + perpX * a, groundY, RUNWAY.z + perpZ * b);
    house.rotation.y = rad + 0.4;
    g.add(house);
  });
  scene.add(g);
  return g;
}

function buildTrees(scene) {
  // Palms near the shore, pines on the high ground — two instanced meshes.
  const palmTrunk = new THREE.CylinderGeometry(0.7, 1.1, 12, 6);
  const palmTop = new THREE.ConeGeometry(6.5, 9, 7);
  const pineTrunk = new THREE.CylinderGeometry(0.8, 1.2, 7, 6);
  const pineTop = new THREE.ConeGeometry(5, 16, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const palmMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  const pineMat = new THREE.MeshLambertMaterial({ color: 0x245c2e });
  const palms = [], pines = [];
  for (let i = 0; i < 900; i++) {
    const x = (hash2(i, 101) - 0.5) * WORLD.size;
    const z = (hash2(i, 202) - 0.5) * WORLD.size;
    const h = heightAt(x, z);
    if (h < 3 || h > 200) continue;
    // Keep the runway pad clear.
    const dx = x - RUNWAY.x, dz = z - RUNWAY.z;
    if (Math.abs(dx) < 260 && Math.abs(dz) < 260) continue;
    if (h < 26) palms.push([x, h, z, 0.8 + hash2(i, 303) * 0.7]);
    else pines.push([x, h, z, 0.8 + hash2(i, 404) * 0.9]);
  }
  const dummy = new THREE.Object3D();
  const palmTrunks = new THREE.InstancedMesh(palmTrunk, trunkMat, palms.length);
  const palmTops = new THREE.InstancedMesh(palmTop, palmMat, palms.length);
  palms.forEach(([x, y, z, s], i) => {
    dummy.position.set(x, y + 6 * s, z); dummy.scale.setScalar(s);
    dummy.rotation.set(0, hash2(i, 1) * 6.28, 0); dummy.updateMatrix();
    palmTrunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, y + 15 * s, z); dummy.updateMatrix();
    palmTops.setMatrixAt(i, dummy.matrix);
  });
  const pineTrunks = new THREE.InstancedMesh(pineTrunk, trunkMat, pines.length);
  const pineTops = new THREE.InstancedMesh(pineTop, pineMat, pines.length);
  pines.forEach(([x, y, z, s], i) => {
    dummy.position.set(x, y + 3.5 * s, z); dummy.scale.setScalar(s);
    dummy.rotation.set(0, hash2(i, 2) * 6.28, 0); dummy.updateMatrix();
    pineTrunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, y + 13 * s, z); dummy.updateMatrix();
    pineTops.setMatrixAt(i, dummy.matrix);
  });
  for (const m of [palmTrunks, palmTops, pineTrunks, pineTops]) {
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  }
}

function buildVolcanoSmoke(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x9a9a94, transparent: true, opacity: 0.38, emissive: 0x555550 });
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(13 + i * 2.4, 8, 8), mat);
    p.position.set(780 + (hash2(i, 9) - 0.5) * 40, 330 + i * 24, -720 + (hash2(i, 8) - 0.5) * 40);
    p.userData.phase = i / 7;
    group.add(p);
    puffs.push(p);
  }
  // Lava glow in the crater.
  const lava = new THREE.Mesh(new THREE.CircleGeometry(16, 20),
    new THREE.MeshBasicMaterial({ color: COLORS.lava }));
  lava.rotation.x = -Math.PI / 2;
  lava.position.set(780, 322, -720);
  group.add(lava);
  scene.add(group);
  return puffs;
}

export function buildTerrain(scene) {
  const seaMat = buildSea(scene);
  buildSky(scene);
  buildGround(scene);
  const clouds = buildClouds(scene);
  const runway = buildRunway(scene);
  buildTrees(scene);
  const smoke = buildVolcanoSmoke(scene);

  const sun = new THREE.DirectionalLight(0xfff2d0, 2.6);
  sun.position.set(-1600, 2200, -1200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1600; sun.shadow.camera.right = 1600;
  sun.shadow.camera.top = 1600; sun.shadow.camera.bottom = -1600;
  sun.shadow.camera.far = 6000;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fd4ff, 0x3d7a4a, 1.15));
  scene.fog = new THREE.Fog(0xcfe8f5, WORLD.fogNear, WORLD.fogFar);

  let t = 0;
  return {
    heightAt,
    update(dt) {
      t += dt;
      seaMat.uniforms.time.value = t;
      for (const c of clouds) {
        c.position.x += c.userData.drift * dt;
        if (c.position.x > WORLD.size * 0.75) c.position.x = -WORLD.size * 0.75;
      }
      for (const p of smoke) {
        p.position.y += dt * 7;
        p.position.x += dt * 4;
        if (p.position.y > 520) p.position.y = 330;
      }
      runway.userData.sock.rotation.y = Math.sin(t * 0.7) * 0.35;
    },
  };
}
