// The hero object, built in code: a brass-and-ink desk globe with raised brass
// continents, a glowing dot layer, a meridian ring, a turned-brass base and a
// saffron orbit. No model file to download, so it is crisp at any size.
import * as THREE from 'three';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import land from 'world-atlas/land-110m.json';

const TILT = THREE.MathUtils.degToRad(23.4);
const R = 0.62;          // sphere radius
const RING = 0.7;        // meridian ring radius
const STEM_TOP = 0.42;   // where the stem meets the ring

// Equirectangular land mask, white land on black, north at the top.
function landCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const proj = geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]);
  const path = geoPath(proj, g);
  g.beginPath();
  path(feature(land, land.objects.land));
  g.fillStyle = '#fff';
  g.fill();
  return { canvas: c, proj, path };
}

// Deep ink ocean with a faint saffron graticule.
function oceanCanvas(w, h, accent, proj) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0d2238');
  grad.addColorStop(0.5, '#173a5c');
  grad.addColorStop(1, '#0d2238');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.beginPath();
  geoPath(proj, g)(geoGraticule10());
  g.strokeStyle = accent;
  g.globalAlpha = 0.16;
  g.lineWidth = 1.5;
  g.stroke();
  return c;
}

// lat/lon (degrees) to a point on the sphere, matching SphereGeometry's UVs.
export function latLon(lat, lon, r = R) {
  const phi = THREE.MathUtils.degToRad(lon + 180);
  const theta = THREE.MathUtils.degToRad(90 - lat);
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

export function buildGlobe({ accent, accent2, lite }) {
  const root = new THREE.Group();
  const W = lite ? 1024 : 2048, H = W / 2;
  const mask = landCanvas(W, H);

  const brass = new THREE.MeshStandardMaterial({ color: 0xc0903f, metalness: 1, roughness: 0.3 });
  const darkBrass = new THREE.MeshStandardMaterial({ color: 0x5a4220, metalness: 1, roughness: 0.42 });

  // ---- base: a turned-brass foot ----
  const profile = [[0, 0], [0.44, 0], [0.46, 0.015], [0.46, 0.05], [0.43, 0.07], [0.36, 0.085], [0.31, 0.11],
    [0.2, 0.14], [0.12, 0.17], [0.085, 0.21], [0.07, 0.26], [0.075, 0.29], [0.055, 0.31], [0, 0.31]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const base = new THREE.Mesh(new THREE.LatheGeometry(profile, lite ? 48 : 96), brass);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.465, 0.465, 0.012, lite ? 48 : 96), darkBrass);
  plinth.position.y = 0.006;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, STEM_TOP - 0.3, 32), brass);
  stem.position.y = 0.3 + (STEM_TOP - 0.3) / 2;
  root.add(base, plinth, stem);

  // ---- the tilted assembly: ring, pins and the spinning sphere ----
  const tilt = new THREE.Group();
  tilt.position.set(-RING * Math.sin(TILT), STEM_TOP + RING * Math.cos(TILT), 0);
  tilt.rotation.z = TILT;
  root.add(tilt);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING, 0.017, 16, lite ? 160 : 320), brass);
  const pinGeo = new THREE.CylinderGeometry(0.014, 0.014, RING - R + 0.04, 16);
  const pinN = new THREE.Mesh(pinGeo, brass);
  pinN.position.y = (R + RING) / 2;
  const pinS = pinN.clone();
  pinS.position.y = -(R + RING) / 2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), brass);
  cap.position.y = RING + 0.012;
  tilt.add(ring, pinN, pinS, cap);

  const spin = new THREE.Group();
  tilt.add(spin);
  const seg = lite ? 64 : 128;
  const oceanTex = new THREE.CanvasTexture(oceanCanvas(W, H, accent, mask.proj));
  oceanTex.colorSpace = THREE.SRGBColorSpace;
  oceanTex.anisotropy = 8;
  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(R, seg, seg / 2),
    new THREE.MeshPhysicalMaterial({ map: oceanTex, metalness: 0.1, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.18 })
  );
  const maskTex = new THREE.CanvasTexture(mask.canvas);
  maskTex.anisotropy = 8;
  const continents = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.006, seg, seg / 2),
    new THREE.MeshStandardMaterial({ color: 0xe0ad55, metalness: 0.85, roughness: 0.3, emissive: 0x3a2306, envMapIntensity: 1.6, alphaMap: maskTex, alphaTest: 0.5, bumpMap: maskTex, bumpScale: 2 })
  );
  spin.add(ocean, continents);

  // ---- a glowing dot layer over the land: the "high tech" read ----
  const g = mask.canvas.getContext('2d');
  const px = g.getImageData(0, 0, W, H).data;
  const pts = [];
  const N = lite ? 9000 : 22000, golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = golden * i;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const lat = Math.asin(y) * 180 / Math.PI;
    const phi = (Math.atan2(z, -x) + 2 * Math.PI) % (2 * Math.PI);        // inverse of latLon()
    const ix = Math.min(W - 1, Math.floor((phi / (2 * Math.PI)) * W));
    const iy = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
    if (px[(iy * W + ix) * 4] > 128) pts.push(new THREE.Vector3(x, y, z).multiplyScalar(R * 1.022));
  }
  const dotGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
    color: accent, size: lite ? 0.009 : 0.0075, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  spin.add(dots);

  // ---- home markers: Chennai and Vijayawada pulse in mint ----
  const markers = [];
  for (const [lat, lon] of [[13.08, 80.27], [16.51, 80.65]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: accent2 }));
    m.position.copy(latLon(lat, lon, R * 1.03));
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 32), new THREE.MeshBasicMaterial({ color: accent2, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    halo.position.copy(m.position);
    halo.lookAt(m.position.clone().multiplyScalar(2));
    spin.add(m, halo);
    markers.push(halo);
  }

  // ---- normalize: height 2, centered on the base, sitting on y = 0 ----
  const box = new THREE.Box3().setFromObject(root);
  const s = 2 / (box.max.y - box.min.y);
  root.scale.setScalar(s);

  // ---- the saffron orbit: a learning trajectory with a travelling light ----
  const orbit = new THREE.Group();
  orbit.position.copy(tilt.position).multiplyScalar(s);
  orbit.rotation.set(1.18, 0, -0.35);
  const orbitR = R * s * 1.62;
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(orbitR, 0.0035, 8, 256),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, depthWrite: false })));
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), new THREE.MeshBasicMaterial({ color: accent }));
  orbit.add(sat);
  const outer = new THREE.Group();
  outer.add(root, orbit);

  // ---- hotspot anchors: a point plus the direction its surface faces ----
  const anchor = (parent, pos, normal) => {
    const o = new THREE.Object3D();
    o.position.copy(pos);
    o.userData.normal = normal.clone().normalize();
    parent.add(o);
    return o;
  };
  const chennai = latLon(13.08, 80.27, R * 1.03);
  const anchors = {
    cities: anchor(spin, chennai, chennai),
    boards: anchor(tilt, new THREE.Vector3(0, RING + 0.03, 0), new THREE.Vector3(0, 1, 0.4)),
    levels: anchor(root, new THREE.Vector3(0.36, 0.09, 0.2), new THREE.Vector3(1, 0.4, 0.6)),
    online: anchor(sat, new THREE.Vector3(), new THREE.Vector3(0, 0, 1)),
  };
  anchors.online.userData.always = true;

  const update = (t) => {
    spin.rotation.y = t * 0.12;
    const a = t * 0.35;
    sat.position.set(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 0);
    markers.forEach((h, i) => {
      const k = (t * 0.8 + i * 0.5) % 1;
      h.scale.setScalar(1 + k * 2.2);
      h.material.opacity = 1 - k;
    });
  };

  return { object: outer, anchors, dots, update, spin };
}
