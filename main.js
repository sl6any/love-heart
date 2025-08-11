/* ====== Canvas + Particles ====== */
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: false });

let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
const particles = [];
let targets = [];          // array of {x,y}
const gap = 5;             // sampling gap (lower = more particles)
const particleSize = 1.8;  // radius
const color = "#ff57c7";

const mouse = { x: -9999, y: -9999, down: false };
const repelRadius = 80;     // px
const repelStrength = 0.15; // force multiplier
const ease = 0.08;          // how fast particles go to their target
const friction = 0.85;      // velocity damping

function resize() {
  W = canvas.width = Math.floor(window.innerWidth * DPR);
  H = canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width = `${Math.floor(W / DPR)}px`;
  canvas.style.height = `${Math.floor(H / DPR)}px`;
  buildTargets();
}
window.addEventListener("resize", debounce(resize, 100));

/* Build target points by drawing heart + text to an offscreen canvas,
   then sampling the alpha channel. */
function buildTargets() {
  const off = new OffscreenCanvas(W, H);
  const octx = off.getContext("2d");

  octx.clearRect(0, 0, W, H);

  // Draw HEART outline (parametric -> path)
  const cx = W / 2, cy = H / 2;
  const scale = Math.min(W, H) * 0.28; // heart size
  octx.strokeStyle = "#fff";
  octx.lineWidth = Math.max(2, scale * 0.01);

  octx.beginPath();
  // parametric heart: t ∈ [0, 2π]
  const steps = 700;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    // classic heart curve
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const px = cx + (x * scale) / 20;
    const py = cy - (y * scale) / 20;
    if (i === 0) octx.moveTo(px, py);
    else octx.lineTo(px, py);
  }
  octx.stroke();

  // Draw TEXT in the middle
  const text = "I ♥ You";
  octx.fillStyle = "#fff";
  let fontSize = Math.floor(scale * 0.35);
  octx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
  octx.textAlign = "center";
  octx.textBaseline = "middle";

  // shrink font if it overflows width
  while (octx.measureText(text).width > scale * 1.7) {
    fontSize -= 2;
    octx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
  }
  octx.fillText(text, cx, cy);

  // Sample pixels
  const img = octx.getImageData(0, 0, W, H).data;
  targets = [];
  for (let y = 0; y < H; y += gap * DPR) {
    for (let x = 0; x < W; x += gap * DPR) {
      const idx = (x + y * W) * 4 + 3; // alpha
      if (img[idx] > 60) {
        targets.push({ x, y });
      }
    }
  }

  // Ensure we have the same number of particles as targets
  if (particles.length < targets.length) {
    const needed = targets.length - particles.length;
    for (let i = 0; i < needed; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0
      });
    }
  } else if (particles.length > targets.length) {
    particles.length = targets.length;
  }
}

/* Animation */
function tick() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const t = targets[i];

    // Easing toward target
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    p.vx += dx * ease * 0.1;
    p.vy += dy * ease * 0.1;

    // Repel around mouse/touch
    const mx = mouse.x, my = mouse.y;
    const rdx = p.x - mx;
    const rdy = p.y - my;
    const dist2 = rdx * rdx + rdy * rdy;
    const r = repelRadius * DPR;
    if (dist2 < r * r) {
      const dist = Math.max(Math.sqrt(dist2), 0.001);
      const force = (1 - dist / r) * repelStrength;
      p.vx += (rdx / dist) * force * 10;
      p.vy += (rdy / dist) * force * 10;
    }

    // Slight movement variance
    p.vx *= friction;
    p.vy *= friction;

    p.x += p.vx;
    p.y += p.vy;

    // draw
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(p.x, p.y, particleSize * DPR, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(tick);
}

/* Pointer interactions */
function setMouse(e) {
  if (e.touches && e.touches[0]) {
    mouse.x = e.touches[0].clientX * DPR;
    mouse.y = e.touches[0].clientY * DPR;
  } else {
    mouse.x = (e.clientX ?? -9999) * DPR;
    mouse.y = (e.clientY ?? -9999) * DPR;
  }
}
window.addEventListener("mousemove", setMouse);
window.addEventListener("touchmove", setMouse, { passive: true });
window.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });

/* Burst scatter on click/tap */
function burst() {
  for (const p of particles) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    p.vx += Math.cos(angle) * speed;
    p.vy += Math.sin(angle) * speed;
  }
}
window.addEventListener("click", burst);
window.addEventListener("touchstart", burst, { passive: true });

/* Utilities */
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* Boot */
resize();
requestAnimationFrame(tick);

/* ====== Music controls (mobile-safe) ====== */
const music = document.getElementById("music");
const btn = document.getElementById("musicBtn");

function setBtnPlaying(playing) {
  btn.setAttribute("aria-pressed", playing ? "true" : "false");
  btn.textContent = playing ? "⏸" : "▶";
}

btn.addEventListener("click", async () => {
  try {
    if (music.paused) {
      await music.play();
      setBtnPlaying(true);
    } else {
      music.pause();
      setBtnPlaying(false);
    }
  } catch (e) {
    console.warn("Playback error:", e);
  }
});

// Optional: small volume
music.volume = 0.6;

// Try to resume on first interaction anywhere (covers some mobile cases)
["pointerdown", "touchstart"].forEach(evt => {
  window.addEventListener(evt, async () => {
    if (music.paused) {
      try { await music.play(); setBtnPlaying(true); } catch {}
    }
  }, { once: true, passive: true });
});
