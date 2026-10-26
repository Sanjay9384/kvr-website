// The live 3D stage: one fixed full-screen WebGL canvas behind the whole page.
// Scroll flies the camera through the story beats, the cursor moves a light,
// the Explore section lets visitors drag to spin the globe.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { makeParticles, radialTexture } from './particles.js';
import { buildGlobe } from './globe.js';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const LITE = matchMedia('(max-width: 768px), (hover: none)').matches;      // phones and tablets
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function initStage({ beats, lightModes, lenis }) {
  const canvas = document.getElementById('stage');
  const fail = () => document.body.classList.add('stage-failed');       // CSS keeps the poster

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !LITE, powerPreference: 'high-performance' });
  } catch { fail(); return null; }
  let dpr = Math.min(devicePixelRatio, LITE ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !LITE;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });

  // ---- scene, fog, reflections (no HDR file needed) ----
  const bg = new THREE.Color(css('--bg'));
  const scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.FogExp2(bg, 0.06);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 60);

  // ---- lights: a warm desk-lamp key, two accent rims behind the globe, a cursor light ----
  const key = new THREE.DirectionalLight(0xffe2b8, 1.8);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  const rimA = new THREE.SpotLight(css('--accent'), 70, 20, 0.55, 0.8);
  rimA.position.set(-3.5, 2.6, -3);
  const rimB = new THREE.SpotLight(css('--accent-2'), 30, 20, 0.55, 0.8);
  rimB.position.set(3.8, 1.4, -2.6);
  const cursorLight = new THREE.PointLight(0xfff0dc, 0, 6, 1.6);
  scene.add(key, rimA, rimB, cursorLight);

  // ---- floor catches the shadow, fades into the fog ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.ShadowMaterial({ opacity: 0.4 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: radialTexture(css('--accent')), transparent: true, opacity: 0.2, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.002;
  scene.add(glow);

  // ---- the globe, built in code ----
  const rig = new THREE.Group();
  scene.add(rig);
  let globe;
  try {
    globe = buildGlobe({ accent: css('--accent'), accent2: css('--accent-2'), lite: LITE });
  } catch (e) { console.warn(e); fail(); return null; }
  globe.object.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  rig.add(globe.object);
  document.documentElement.style.setProperty('--load', '1');
  key.target = rig;
  rimA.target = rig;
  rimB.target = rig;

  // ---- atmosphere: chalk dust in the accent color ----
  const particles = makeParticles(LITE ? 450 : 1400, css('--accent'), renderer.getPixelRatio());
  if (!REDUCED) scene.add(particles);

  // ---- post: gentle bloom on desktop only ----
  let composer = null;
  if (!LITE) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.5, 0.86));
    composer.addPass(new OutputPass());
  }

  // ---- scroll story: one camera keyframe per beat, scrubbed across #story ----
  const fit = () => (camera.aspect < 1 ? 2.1 : camera.aspect < 1.25 ? 1.7 : 1);   // pull back on tall screens
  const st = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, yaw: 0 };
  const setBeat = (b) => Object.assign(st, { px: b.pos[0], py: b.pos[1], pz: b.pos[2], lx: b.look[0], ly: b.look[1], lz: b.look[2], yaw: b.yaw });
  setBeat(beats[0]);
  if (!REDUCED) {
    const tl = gsap.timeline({ defaults: { ease: 'power1.inOut', duration: 1 } });
    beats.slice(1).forEach((b) => tl.to(st, { px: b.pos[0], py: b.pos[1], pz: b.pos[2], lx: b.look[0], ly: b.look[1], lz: b.look[2], yaw: b.yaw }));
    ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 1, animation: tl });
  }

  // ---- after the story the stage dims behind the content sections ----
  gsap.to('.stage-dim', { opacity: 0.86, ease: 'none',
    scrollTrigger: { trigger: '#story', start: 'bottom 95%', end: 'bottom 70%', scrub: true } });

  // ---- Explore: stage undims, drag to spin, hotspots show ----
  let exploring = false, dragYaw = 0, dragVel = 0, dragging = false, lastX = 0;
  ScrollTrigger.create({ trigger: '#explore', start: 'top 60%', end: 'bottom 40%',
    onToggle: (self) => {
      exploring = self.isActive;
      document.body.classList.toggle('exploring', exploring);   // CSS undims; never tween .stage-dim here
    } });
  const dragZone = document.querySelector('#explore .explore__drag');
  dragZone.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; dragZone.setPointerCapture?.(e.pointerId); });
  dragZone.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragVel = (e.clientX - lastX) * 0.008;
    dragYaw += dragVel;
    lastX = e.clientX;
  });
  const endDrag = () => { dragging = false; };
  dragZone.addEventListener('pointerup', endDrag);
  dragZone.addEventListener('pointercancel', endDrag);

  // ---- light modes ----
  function setLightMode(name) {
    const m = lightModes[name];
    if (!m) return;
    gsap.to(renderer, { toneMappingExposure: m.exposure, duration: 0.8 });
    gsap.to(key, { intensity: m.key, duration: 0.8 });
    gsap.to(rimA, { intensity: m.rim, duration: 0.8 });
    gsap.to(rimB, { intensity: m.rim2, duration: 0.8 });
    gsap.to(globe.dots.material, { opacity: m.dots, duration: 0.8 });
    const k = new THREE.Color(m.keyColor);
    gsap.to(key.color, { r: k.r, g: k.g, b: k.b, duration: 0.8 });
    const c = new THREE.Color(m.fog);
    gsap.to(scene.fog.color, { r: c.r, g: c.g, b: c.b, duration: 0.8 });
    gsap.to(scene.background, { r: c.r, g: c.g, b: c.b, duration: 0.8 });
    document.querySelectorAll('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === name)));
  }
  document.querySelectorAll('[data-light]').forEach((b) => b.addEventListener('click', () => setLightMode(b.dataset.light)));

  // ---- hotspots: anchors on the globe, projected to HTML labels every frame ----
  const hs = Object.entries(globe.anchors).map(([id, o]) => ({ id, o, el: document.querySelector(`[data-hotspot="${id}"]`) }));
  const tmp = new THREE.Vector3(), nW = new THREE.Vector3(), toCam = new THREE.Vector3();

  // ---- cursor ----
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  }, { passive: true });

  // ---- resize ----
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer?.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);
  resize();

  // ---- render loop with adaptive quality and pause when hidden or covered ----
  let frames = 0, acc = 0, last = performance.now(), fps = 60;
  const cover = document.querySelector('.stage-cover');
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  const clock = new THREE.Clock();

  function tick() {
    const now = performance.now(), dt = now - last;
    last = now;
    if (document.hidden || (cover && cover.getBoundingClientRect().top <= 0)) return;
    const t = clock.getElapsedTime();

    acc += dt; frames++;
    if (frames === 90) {
      fps = 1000 / (acc / frames);
      if (fps < 42 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
      frames = 0; acc = 0;
    }

    // portrait screens: globe centered and low, copy above it; landscape: the beat's side offset
    const k = fit(), portrait = camera.aspect < 1.25;
    camera.position.set(st.px * k, st.py * (portrait ? 1.1 : 1), st.pz * k);
    if (portrait) {
      // phones never get the macro close-up: keep the whole globe in frame below the copy
      const d = Math.hypot(camera.position.x, camera.position.z);
      if (d < 7.5) { camera.position.x *= 7.5 / d; camera.position.z *= 7.5 / d; }
      camera.position.y = Math.max(camera.position.y, 1.2);
    }
    camera.lookAt(portrait ? 0 : st.lx, st.ly + (portrait ? 1.4 : 0), portrait ? 0 : st.lz);

    if (!dragging) { dragVel *= 0.94; dragYaw += dragVel; }
    const idle = REDUCED ? 0 : Math.sin(t * 0.25) * 0.06;
    rig.rotation.y = st.yaw + dragYaw + idle;
    rig.rotation.x += ((REDUCED ? 0 : pointer.y * 0.04) - rig.rotation.x) * 0.05;
    globe.update(REDUCED ? 0 : t);
    rig.updateMatrixWorld(true);

    if (!LITE) {
      cursorLight.intensity += ((exploring ? 5 : 2.5) - cursorLight.intensity) * 0.05;
      cursorLight.position.set(pointer.x * 2.2, 1.1 + pointer.y * 1.2, 2.2);
    }

    particles.material.uniforms.uTime.value = t;
    particles.material.uniforms.uBoost.value = Math.min(2, Math.abs(lenis.velocity || 0) * 0.02);

    for (const h of hs) {
      if (!h.el) continue;
      h.o.getWorldPosition(tmp);
      nW.copy(h.o.userData.normal).transformDirection(h.o.parent.matrixWorld);
      toCam.copy(camera.position).sub(tmp).normalize();
      const facing = h.o.userData.always || nW.dot(toCam) > 0.15;
      tmp.project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * innerWidth;
      h.el.style.transform = `translate(${sx}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px)`;
      h.el.classList.toggle('is-left', sx > innerWidth * 0.6);        // labels near the right edge open leftwards
      h.el.classList.toggle('is-hidden', !exploring || !facing);
    }

    composer ? composer.render() : renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(tick);
  tick();
  document.body.classList.add('stage-ready');
  const api = { renderer, scene, camera, rig, globe, setLightMode, get fps() { return fps; }, get dpr() { return dpr; }, get dragYaw() { return dragYaw; } };
  if (import.meta.env.DEV) window.__stage = api;
  return api;
}
