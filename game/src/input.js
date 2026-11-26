// Coral Sky Run — keyboard and mouse input, one clear job.
// Reads the keys and the pointer and turns them into one steering vector:
// throttle (-1..1 steps), roll (-1..1), pitch (-1..1), plus edge-triggered
// actions (camera, gear, restart, mute, pause).
export class Input {
  constructor() {
    this.keys = new Set();
    this.mouseX = 0; // -1..1 across the window
    this.mouseY = 0; // -1..1 down the window
    this.mouseActive = false;
    this.mouseSeenAt = 0;
    this.pressed = new Set(); // edge-triggered, consumed by the game loop
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("mousemove", (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      this.mouseActive = true;
      this.mouseSeenAt = performance.now();
    });
    window.addEventListener("blur", () => this.keys.clear());
  }

  wasPressed(key) {
    const hit = this.pressed.has(key);
    if (hit) this.pressed.delete(key);
    return hit;
  }

  drainPressed() { this.pressed.clear(); }

  // Steering vector for this frame. Mouse steers gently toward where the
  // pointer sits, keys override it while held.
  steering() {
    const k = this.keys;
    let roll = 0, pitch = 0;
    if (k.has("arrowleft") || k.has("a")) roll -= 1;
    if (k.has("arrowright") || k.has("d")) roll += 1;
    if (k.has("arrowup")) pitch += 1;
    if (k.has("arrowdown")) pitch -= 1;
    const mouseFresh = this.mouseActive && performance.now() - this.mouseSeenAt < 2500;
    if (mouseFresh && roll === 0) roll = clamp(this.mouseX * 0.9, -1, 1);
    if (mouseFresh && pitch === 0) pitch = clamp(-this.mouseY * 0.7, -1, 1);
    return {
      roll: clamp(roll, -1, 1),
      pitch: clamp(pitch, -1, 1),
      throttleUp: k.has("w"),
      throttleDown: k.has("s"),
    };
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
