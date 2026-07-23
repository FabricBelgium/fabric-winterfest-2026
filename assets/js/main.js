/* ==========================================================================
   Winterfest 2026 - main.js
   Lenis smooth scroll, GSAP reveals, Three.js snow (home hero only),
   nav scroll behavior, mobile drawer, scroll progress bar.
   ========================================================================== */

(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* ---- Lenis smooth scroll ---- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    // Bridge Lenis to ScrollTrigger if loaded
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---- Sticky header (transparent → frosted) ---- */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile nav drawer ---- */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (navToggle && mobileNav) {
    const openIcon = navToggle.querySelector('.icon-menu');
    const closeIcon = navToggle.querySelector('.icon-close');
    const toggle = (open) => {
      mobileNav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (openIcon && closeIcon) {
        openIcon.style.display = open ? 'none' : 'block';
        closeIcon.style.display = open ? 'block' : 'none';
      }
      if (lenis) {
        open ? lenis.stop() : lenis.start();
      }
    };
    navToggle.addEventListener('click', () => {
      toggle(!mobileNav.classList.contains('is-open'));
    });
    mobileNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => toggle(false));
    });
  }

  /* ---- Nav dropdown (Tracks) ---- */
  document.querySelectorAll('.nav-dropdown').forEach((dd) => {
    const trigger = dd.querySelector('.nav-dropdown-toggle');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('is-open');
    });
    document.addEventListener('click', () => dd.classList.remove('is-open'));
  });

  /* ---- Active nav link ---- */
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const normalized = href.replace(/\.\.\//g, '').replace(/^\.\//, '').replace(/\/$/, '');
    if (path.endsWith(normalized) && normalized !== '#' && normalized !== '') {
      a.classList.add('is-active');
    }
  });

  /* ---- Scroll progress bar (prose pages) ---- */
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    const update = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      progressBar.style.width = pct + '%';
      progressBar.classList.toggle('is-active', window.scrollY > 200);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---- GSAP scroll reveals ---- */
  if (!reduced && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.reveal').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }
      );
    });
    gsap.utils.toArray('.reveal-stagger').forEach((group) => {
      const children = group.children;
      gsap.fromTo(
        children,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        }
      );
    });

    // Hero mountain parallax (home only)
    const mountains = document.querySelector('.hero-mountains');
    if (mountains) {
      const far = mountains.querySelector('.layer-far');
      const mid = mountains.querySelector('.layer-mid');
      const near = mountains.querySelector('.layer-near');
      if (far || mid || near) {
        gsap.to(far, {
          y: () => window.innerHeight * 0.12,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to(mid, {
          y: () => window.innerHeight * 0.22,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to(near, {
          y: () => window.innerHeight * 0.32,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to('.hero-content', {
          y: () => window.innerHeight * 0.08,
          opacity: 0.2,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
      }
    }
  }

  /* ---- Three.js snow (home hero only, desktop only) ---- */
  const canvas = document.getElementById('snow-canvas');
  if (canvas && !reduced && !isMobile && window.THREE) {
    initSnow(canvas);
  } else if (canvas) {
    // Hide the canvas on mobile / reduced motion; CSS snow elsewhere handles ambiance
    canvas.remove();
  }

  function initSnow(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const heroEl = canvas.parentElement;
    const setSize = () => {
      const w = heroEl.clientWidth;
      const h = heroEl.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 50;

    // particles
    const count = 200;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const drifts = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 80 - 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      speeds[i] = 0.04 + Math.random() * 0.08;
      drifts[i] = Math.random() * Math.PI * 2;
      sizes[i] = 0.6 + Math.random() * 1.6;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // round soft sprite
    const sprite = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.4, 'rgba(244,237,224,0.85)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      return tex;
    })();

    const mat = new THREE.PointsMaterial({
      size: 1.4,
      sizeAttenuation: true,
      map: sprite,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    setSize();
    window.addEventListener('resize', setSize);

    let t0 = performance.now();
    function animate(t) {
      const dt = Math.min(50, t - t0);
      t0 = t;
      const pos = geom.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        pos[ix + 1] -= speeds[i] * (dt / 16);
        drifts[i] += 0.005 * (dt / 16);
        pos[ix + 0] += Math.sin(drifts[i]) * 0.018 * (dt / 16);
        if (pos[ix + 1] < -30) {
          pos[ix + 0] = (Math.random() - 0.5) * 100;
          pos[ix + 1] = 50;
          pos[ix + 2] = (Math.random() - 0.5) * 60;
        }
      }
      geom.attributes.position.needsUpdate = true;
      points.rotation.y += 0.0004 * (dt / 16);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  /* ---- CSS snow particle injection (subpages) ---- */
  document.querySelectorAll('.css-snow').forEach((host) => {
    if (reduced) return;
    const flakes = 30;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < flakes; i++) {
      const s = document.createElement('span');
      const left = Math.random() * 100;
      const size = 2 + Math.random() * 4;
      const dur = 10 + Math.random() * 16;
      const delay = -Math.random() * dur;
      s.style.left = left + '%';
      s.style.width = s.style.height = size + 'px';
      s.style.animationDuration = dur + 's';
      s.style.animationDelay = delay + 's';
      s.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);
      frag.appendChild(s);
    }
    host.appendChild(frag);
  });

  /* ---- Smooth-scroll anchors (with Lenis fallback) ---- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(target, { offset: -80, duration: 1.2 });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
