// "The lesson in motion": a pinned chalk-light board. As the visitor scrolls,
// saffron lines draw one subject after another (maths, physics, chemistry,
// biology, commerce), the way a tutor would on paper.
import gsap from 'gsap';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Each scene draws itself for p in [0, 1]. Coordinates are in a 1000 x 600 board.
const scenes = [
  // Maths: axes, a parabola, its vertex and roots
  (g, p, A, B) => {
    line(g, 120, 470, 120 + 760 * ease(p, 0, 0.2), 470, B, 1.5);
    line(g, 500, 540, 500, 540 - 480 * ease(p, 0, 0.2), B, 1.5);
    curve(g, (t) => [200 + t * 600, 470 - (1 - ((t - 0.5) * 2) ** 2) * 340], ease(p, 0.15, 0.75), A, 3);
    dot(g, 500, 130, ease(p, 0.75, 0.85), A);
    dot(g, 200, 470, ease(p, 0.8, 0.9), A);
    dot(g, 800, 470, ease(p, 0.85, 0.95), A);
  },
  // Physics: a projectile arc with velocity vectors
  (g, p, A, B) => {
    line(g, 100, 500, 100 + 800 * ease(p, 0, 0.15), 500, B, 1.5);
    const arc = (t) => [140 + t * 700, 500 - Math.sin(t * Math.PI) * 330];
    curve(g, arc, ease(p, 0.1, 0.7), A, 3);
    for (const [i, t] of [0.12, 0.5, 0.88].entries()) {
      const k = ease(p, 0.55 + i * 0.12, 0.7 + i * 0.12);
      const [x, y] = arc(t);
      const vy = -Math.cos(t * Math.PI) * 150;
      arrow(g, x, y, x + 90 * k, y + vy * 0.6 * k, B, 2, k);
    }
  },
  // Chemistry: a benzene ring with its bonds
  (g, p, A, B) => {
    const cx = 500, cy = 300, r = 150;
    const pts = [...Array(6)].map((_, i) => [cx + r * Math.cos(i * Math.PI / 3 - Math.PI / 2), cy + r * Math.sin(i * Math.PI / 3 - Math.PI / 2)]);
    const k = ease(p, 0, 0.6) * 6;
    for (let i = 0; i < 6; i++) {
      const f = Math.max(0, Math.min(1, k - i));
      if (!f) continue;
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 6];
      line(g, x1, y1, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, A, 3);
      const [ox, oy] = [pts[(i + 1) % 6][0] - x1, pts[(i + 1) % 6][1] - y1];
      if (i % 2 === 0 && f === 1) {
        const ix = (cx - x1) * 0.14, iy = (cy - y1) * 0.14, jx = (cx - x2) * 0.14, jy = (cy - y2) * 0.14;
        const f2 = ease(p, 0.6, 0.85);
        line(g, x1 + ix, y1 + iy, x1 + ix + (ox + jx - ix) * f2, y1 + iy + (oy + jy - iy) * f2, B, 2);
      }
      const [ex, ey] = [cx + (pts[i][0] - cx) * 1.6, cy + (pts[i][1] - cy) * 1.6];
      const f3 = ease(p, 0.75 + i * 0.03, 0.9 + i * 0.015);
      line(g, x1, y1, x1 + (ex - x1) * f3 * 0.6, y1 + (ey - y1) * f3 * 0.6, B, 1.5);
    }
  },
  // Biology: a double helix
  (g, p, A, B) => {
    const k = ease(p, 0, 0.75);
    curve(g, (t) => [150 + t * 700, 300 + Math.sin(t * Math.PI * 4) * 120], k, A, 3);
    curve(g, (t) => [150 + t * 700, 300 - Math.sin(t * Math.PI * 4) * 120], k, A, 3);
    for (let i = 1; i < 24; i++) {
      const t = i / 24;
      if (t > k) break;
      const x = 150 + t * 700, y = Math.sin(t * Math.PI * 4) * 120;
      line(g, x, 300 + y, x, 300 + y - 2 * y * ease(p, 0.2 + t * 0.6, 0.3 + t * 0.65), B, 1.5);
    }
  },
  // Commerce: a rising bar chart with a trend line
  (g, p, A, B) => {
    line(g, 140, 500, 140 + 720 * ease(p, 0, 0.15), 500, B, 1.5);
    const h = [120, 170, 150, 240, 290, 360];
    h.forEach((v, i) => {
      const k = ease(p, 0.1 + i * 0.08, 0.3 + i * 0.08);
      const x = 190 + i * 115;
      g.strokeStyle = B; g.lineWidth = 2;
      g.strokeRect(x, 500 - v * k, 60, v * k);
    });
    curve(g, (t) => { const i = t * 5; const a = Math.floor(i), b = Math.min(5, a + 1), f = i - a; return [220 + i * 115, 500 - (h[a] + (h[b] - h[a]) * f) - 30]; }, ease(p, 0.55, 0.95), A, 3);
  },
];

function ease(p, a, b) { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); }
function line(g, x1, y1, x2, y2, c, w) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function curve(g, f, k, c, w) {
  if (k <= 0) return;
  g.strokeStyle = c; g.lineWidth = w; g.beginPath();
  const n = Math.max(2, Math.floor(160 * k));
  for (let i = 0; i <= n; i++) { const [x, y] = f((i / n) * k); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
}
function dot(g, x, y, k, c) { if (k <= 0) return; g.fillStyle = c; g.beginPath(); g.arc(x, y, 7 * k, 0, Math.PI * 2); g.fill(); }
function arrow(g, x1, y1, x2, y2, c, w, k) {
  if (k <= 0) return;
  line(g, x1, y1, x2, y2, c, w);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 12 * k;
  line(g, x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45), c, w);
  line(g, x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45), c, w);
}

export function initLines() {
  const section = document.getElementById('lesson');
  const canvas = section.querySelector('canvas');
  const labels = [...section.querySelectorAll('.lesson__subject')];
  const g = canvas.getContext('2d');
  const A = css('--accent'), B = 'rgba(234, 240, 244, 0.55)';
  let progress = 0;

  function draw() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    if (canvas.width !== Math.round(r.width * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    const s = Math.min(canvas.width / 1000, canvas.height / 600);
    g.setTransform(s, 0, 0, s, (canvas.width - 1000 * s) / 2, (canvas.height - 600 * s) / 2);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = A; g.shadowBlur = 14;

    const f = progress * scenes.length;
    const i = Math.min(scenes.length - 1, Math.floor(f));
    const local = Math.min(1, (f - i) * 1.35);                   // draw, then hold for a beat
    const fade = i < scenes.length - 1 ? 1 - ease(f - i, 0.86, 1) : 1;
    g.globalAlpha = fade;
    scenes[i](g, local, A, B);
    labels.forEach((l, j) => l.classList.toggle('is-active', j === i));
  }

  const pin = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top top', end: () => '+=' + innerHeight * (pin ? 3.2 : 0.01), pin, scrub: 0.6,
      onUpdate: (self) => { progress = pin ? self.progress : 0.99; draw(); },
    },
  });
  addEventListener('resize', draw);
  progress = pin ? 0 : 0.99;
  draw();
}
