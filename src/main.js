import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLines } from './lines.js';
gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';   // the story always starts at beat one

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

// In-page links scroll smoothly through Lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  e.preventDefault();
  lenis.scrollTo(id, { offset: 0 });
  document.body.classList.remove('nav-open');
}));
document.querySelector('.nav__toggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));

// Header turns solid once the story is behind us
ScrollTrigger.create({ start: 120, onToggle: (s) => document.body.classList.toggle('scrolled', s.isActive) });

// three.js loads after the page text, so the poster and copy paint first
import('./stage.js').then(({ initStage }) => initStage({
  lenis,
  beats: [
    { pos: [3.4, 1.7, 4.4], look: [-0.62, 1.0, 0.48], yaw: 0 },
    { pos: [1.15, 0.55, 1.6], look: [0.28, 0.3, -0.2], yaw: 0.8 },
    { pos: [0, 1.15, 5.6], look: [-0.85, 1.05, 0], yaw: 1.9 },
    { pos: [-3.4, 3.8, 3.2], look: [0.55, 0.75, 0.55], yaw: 3.6 },
    { pos: [3.9, 1.4, 3.9], look: [-0.5, 1.0, 0.5], yaw: 6.28 },
  ],
  lightModes: {
    lamp:    { exposure: 1.0,  key: 1.8, keyColor: '#ffe2b8', rim: 70,  rim2: 30, dots: 0.55, fog: '#0b1016' },
    monsoon: { exposure: 0.85, key: 0.5, keyColor: '#bcd6ff', rim: 40,  rim2: 120, dots: 0.95, fog: '#070c12' },
    dusk:    { exposure: 1.15, key: 2.4, keyColor: '#ffb27a', rim: 110, rim2: 10, dots: 0.4, fog: '#1a1210' },
  },
})).catch(() => document.body.classList.add('stage-failed'));

initLines();

// Years since 2007, kept current
document.querySelectorAll('[data-years]').forEach((el) => { el.dataset.count = new Date().getFullYear() - 2007; el.textContent = el.dataset.count; });

// Reveal on scroll
if (!REDUCED) {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  // count-up numbers in the impact row
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = +el.dataset.count, o = { v: el.dataset.from ? +el.dataset.from : 0 };
    el.textContent = o.v;
    gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => { el.textContent = Math.round(o.v); } });
  });
}

// Syllabus map: pick a level, see which boards and formats cover it
const levels = {
  primary:   { title: 'LKG to Class 5', text: 'Reading, number sense, EVS and the habits that make school easy. Patient tutors who keep it playful.', boards: ['cbse', 'state', 'icse', 'igcse', 'ib'] },
  middle:    { title: 'Classes 6 to 8', text: 'Maths, science, languages and social studies, built step by step so nothing is left as a gap.', boards: ['cbse', 'state', 'icse', 'igcse', 'ib'] },
  secondary: { title: 'Classes 9 and 10', text: 'Board-year focus: full syllabus coverage, past papers, timed practice and revision plans.', boards: ['cbse', 'state', 'icse', 'igcse', 'ib'] },
  senior:    { title: 'Classes 11 and 12', text: 'Maths, physics, chemistry, biology, accountancy, commerce and computer science, with board and entrance prep side by side.', boards: ['cbse', 'state', 'icse', 'ib'] },
  entrance:  { title: 'NEET and IIT-JEE', text: 'Concept depth, problem drills and mock tests for medical and engineering entrance exams.', boards: ['neet', 'jee'] },
  college:   { title: 'Diploma, engineering, degree, MBA', text: 'Engineering maths, core engineering subjects, diploma maths, degree subjects and MBA papers.', boards: ['uni'] },
};
const map = document.querySelector('.syllabus');
function pickLevel(id) {
  const l = levels[id];
  map.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === id)));
  map.querySelectorAll('[data-board]').forEach((c) => c.classList.toggle('is-on', l.boards.includes(c.dataset.board)));
  map.querySelector('.syllabus__title').textContent = l.title;
  map.querySelector('.syllabus__text').textContent = l.text;
}
map.querySelectorAll('[data-level]').forEach((b) => {
  b.addEventListener('click', () => pickLevel(b.dataset.level));
  b.addEventListener('mouseenter', () => pickLevel(b.dataset.level));
});
pickLevel('senior');

// Made-for switcher
document.querySelectorAll('[data-aud]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-aud]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  document.querySelectorAll('[data-aud-panel]').forEach((p) => { p.hidden = p.dataset.audPanel !== b.dataset.aud; });
}));

// 3D tilt on the feature tiles (desktop only)
if (matchMedia('(hover: hover)').matches && !REDUCED) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      el.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
      el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// Enquiry form: opens the visitor's email app addressed to KVR, prefilled
document.querySelector('#enquiry').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = `Name: ${f.get('name')}\nPhone: ${f.get('phone')}\nStudent's class / course: ${f.get('level')}\nSubjects: ${f.get('subjects')}\nPreferred: ${f.get('mode')}\nArea: ${f.get('area')}`;
  location.href = `mailto:kvrtutors@gmail.com?subject=${encodeURIComponent('Free demo class request')}&body=${encodeURIComponent(body)}`;
  e.target.classList.add('is-sent');
});

document.querySelector('#year').textContent = new Date().getFullYear();

if (import.meta.env.DEV) { window.__lenis = lenis; window.__ST = ScrollTrigger; }
