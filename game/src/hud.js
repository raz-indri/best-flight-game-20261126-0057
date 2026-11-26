// Coral Sky Run — the heads-up display: instruments, compass, messages.
// One clear job: turn flight state into readable numbers and dials, and
// show the mission banners and the end-of-flight card.
import { FLIGHT, RINGS } from "./config.js";

const $ = (id) => document.getElementById(id);
const pad3 = (n) => String(Math.round(n)).padStart(3, "0");
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export class Hud {
  constructor() {
    this.horizon = $("horizon").getContext("2d");
    this.compass = $("compass").getContext("2d");
    this.msgTimer = 0;
  }

  showMessage(text, sub = "", seconds = 2.6) {
    const el = $("hud-msg");
    el.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ""}`;
    el.style.display = "block";
    this.msgTimer = seconds;
  }

  hideMessage() { $("hud-msg").style.display = "none"; }

  update(dt, f, state) {
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.hideMessage();
    }
    $("alt").textContent = Math.round(f.altitudeFt).toLocaleString("en-US");
    $("spd").textContent = Math.round(f.speedKnots);
    $("hdg").textContent = pad3(f.headingDeg);
    $("vs").textContent = (f.verticalSpeed >= 0 ? "+" : "") + Math.round(f.verticalSpeed * 196.85);
    $("score").textContent = state.score.toLocaleString("en-US");
    $("ring").textContent = `${state.ringsPassed} / ${RINGS.length}`;
    $("time").textContent = fmtTime(state.elapsed);
    $("thr-pct").textContent = `${Math.round(f.throttle * 100)}%`;
    $("fuel-pct").textContent = `${Math.round(state.fuel)}%`;
    $("throttle-fill").style.width = `${f.throttle * 100}%`;
    const fuelFill = $("fuel-fill");
    fuelFill.style.width = `${state.fuel}%`;
    fuelFill.classList.toggle("low", state.fuel < 25);
    const next = state.nextRing;
    if (next) {
      $("target-name").textContent = `RING ${state.ringsPassed + 1} — ${next.userData.def.name}`;
      $("target-dist").textContent = `${Math.round(state.distToRing)} m ahead`;
      $("mission").textContent = state.ringsPassed >= RINGS.length
        ? "All rings done — land on Luma runway"
        : "Fly through the rings, then land on Luma runway";
    } else {
      $("target-name").textContent = "ALL RINGS CLEAR — LAND!";
      $("target-dist").textContent = "Runway Luma, heading 035°";
      $("mission").textContent = "Bring her home — gentle and slow";
    }
    this.drawHorizon(f);
    this.drawCompass(f);
  }

  drawHorizon(f) {
    const ctx = this.horizon, W = 110, H = 110, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-f.roll);
    const pitchPx = f.pitch * 60;
    ctx.fillStyle = "#3d8fd1";
    ctx.fillRect(-60, -60 + pitchPx, 120, 60);
    ctx.fillStyle = "#8a6b46";
    ctx.fillRect(-60, pitchPx, 120, 60);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-60, pitchPx); ctx.lineTo(60, pitchPx); ctx.stroke();
    ctx.restore();
    // Fixed wings marker.
    ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 34, cy); ctx.lineTo(cx - 12, cy);
    ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 34, cy);
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.stroke();
  }

  drawCompass(f) {
    const ctx = this.compass, W = 260, H = 34;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(6,22,38,.55)";
    ctx.fillRect(0, 0, W, H);
    const heading = f.headingDeg;
    const pxPerDeg = W / 120; // 120° window
    ctx.font = "bold 12px Verdana";
    ctx.textAlign = "center";
    for (let d = -60; d <= 60; d += 5) {
      const deg = (Math.round(heading) + d + 360) % 360;
      const x = W / 2 + d * pxPerDeg;
      const major = deg % 30 === 0;
      ctx.strokeStyle = major ? "#eaf6ff" : "rgba(234,246,255,.45)";
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, major ? 6 : 12); ctx.lineTo(x, 20); ctx.stroke();
      if (major) {
        const label = deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : deg === 270 ? "W" : pad3(deg);
        ctx.fillStyle = "#eaf6ff";
        ctx.fillText(label, x, 32);
      }
    }
    // Centre lubber line.
    ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, 20); ctx.stroke();
  }

  showEnd(title, lines) {
    $("end-title").textContent = title;
    $("end-stats").innerHTML = lines.map((l) => `${l}<br>`).join("");
    $("end").style.display = "flex";
  }

  hideEnd() { $("end").style.display = "none"; }
  hideMenu() { $("menu").style.display = "none"; }
  showMenu() { $("menu").style.display = "flex"; }
}
