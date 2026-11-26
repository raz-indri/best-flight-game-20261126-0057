// Coral Sky Run — the eight sky rings of the Island Run.
// One clear job: build the ring meshes, keep the sequence, and tell the
// game when the aeroplane threads the next ring.
import { COLORS, RINGS } from "./config.js";

export class RingCourse {
  constructor(scene) {
    this.group = new THREE.Group();
    this.rings = RINGS.map((def, i) => {
      const ring = new THREE.Group();
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(def.r, 1.6, 12, 48),
        new THREE.MeshBasicMaterial({ color: COLORS.ringTodo, transparent: true, opacity: 0.9 })
      );
      ring.add(torus);
      const inner = new THREE.Mesh(
        new THREE.TorusGeometry(def.r, 0.5, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      );
      ring.add(inner);
      // A small beacon light on top so the next ring reads at distance.
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10),
        new THREE.MeshBasicMaterial({ color: COLORS.ringTodo }));
      beacon.position.y = def.r + 6;
      ring.add(beacon);
      ring.position.set(def.x, def.y, def.z);
      ring.userData = { def, index: i, torus, beacon, passed: false };
      this.group.add(ring);
      return ring;
    });
    scene.add(this.group);
    this.nextIndex = 0;
    this.passed = 0;
    this.updateColors();
  }

  next() {
    return this.nextIndex < this.rings.length ? this.rings[this.nextIndex] : null;
  }

  updateColors() {
    for (const ring of this.rings) {
      const u = ring.userData;
      const color = u.passed ? COLORS.ringDone
        : u.index === this.nextIndex ? COLORS.ringNext : COLORS.ringTodo;
      u.torus.material.color.setHex(color);
      u.beacon.material.color.setHex(color);
    }
  }

  // Returns the ring just passed, or null. A pass counts when the plane
  // crosses the ring's plane within its radius.
  checkPass(prev, curr) {
    const ring = this.next();
    if (!ring) return null;
    const c = ring.position;
    const r = ring.userData.def.r;
    // Ring faces the incoming direction: its plane normal is the vector
    // from the previous ring (or spawn) to this ring, levelled.
    const from = this.prevPoint();
    const nx = c.x - from.x, nz = c.z - from.z;
    const nl = Math.hypot(nx, nz) || 1;
    const dPrev = (prev.x - c.x) * (nx / nl) + (prev.z - c.z) * (nz / nl);
    const dCurr = (curr.x - c.x) * (nx / nl) + (curr.z - c.z) * (nz / nl);
    if (dPrev <= 0 && dCurr > 0) {
      const dy = curr.y - c.y;
      const dx = curr.x - c.x, dz = curr.z - c.z;
      const radial = Math.hypot(dx, dz, dy);
      if (radial < r + 6) {
        ring.userData.passed = true;
        this.passed += 1;
        this.nextIndex += 1;
        this.updateColors();
        return ring;
      }
    }
    return null;
  }

  prevPoint() {
    if (this.nextIndex === 0) return { x: -1150, y: 60, z: 950 };
    const p = RINGS[this.nextIndex - 1];
    return { x: p.x, y: p.y, z: p.z };
  }

  distanceToNext(from) {
    const ring = this.next();
    if (!ring) return null;
    const c = ring.position;
    return Math.hypot(c.x - from.x, c.y - from.y, c.z - from.z);
  }

  reset() {
    for (const ring of this.rings) ring.userData.passed = false;
    this.nextIndex = 0;
    this.passed = 0;
    this.updateColors();
  }

  update(dt, t) {
    for (const ring of this.rings) {
      const u = ring.userData;
      const pulse = 1 + Math.sin(t * 2.4 + u.index) * 0.05;
      ring.scale.setScalar(pulse);
      if (u.index === this.nextIndex) {
        u.beacon.material.opacity = 0.6 + Math.sin(t * 5) * 0.4;
      }
      // Rings face the incoming flight direction.
      const from = u.index === 0 ? { x: -1150, z: 950 } : RINGS[u.index - 1];
      const ang = Math.atan2(ring.position.x - from.x, ring.position.z - from.z);
      ring.rotation.y = ang;
    }
  }
}
