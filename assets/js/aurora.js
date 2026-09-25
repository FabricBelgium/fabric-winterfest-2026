/* Aurora night sky in Fabric colours, rendered with WebGL.
   Usage: <canvas class="aurora" data-edge="0.55" data-amp="1" data-stars="1"></canvas>
   data-edge: height of the curtain's lower edge (0 = bottom, 1 = top)
   data-amp: brightness; data-stars: 0/1; data-scroll: 1 for the fixed page sky.
   Falls back to a static CSS gradient. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vert = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const frag = `
precision highp float;
uniform vec2 r;
uniform float t;
uniform float edge;
uniform float amp;
uniform float stars;
uniform float sy;   /* scroll offset in canvas pixels, for star parallax */

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }

/* One layer of stars: a soft dot in a random spot of some grid cells, with a slow twinkle */
float starLayer(vec2 fc, float cell, float density, float seed){
  vec2 id = floor(fc / cell);
  vec2 f = fract(fc / cell);
  float h = hash(id + seed);
  if (h < 1.0 - density) return 0.0;
  vec2 c = 0.2 + 0.6 * vec2(hash(id + seed + 1.3), hash(id + seed + 7.1));
  float dd = length(f - c) * cell;
  float size = 0.55 + 0.85 * hash(id + seed + 3.7);
  float tw = 0.6 + 0.4 * sin(t * (0.4 + h * 1.4) + h * 40.0);
  return smoothstep(size, 0.0, dd) * tw * (0.35 + 0.65 * hash(id + seed + 9.2));
}

void main(){
  vec2 uv = gl_FragCoord.xy / r;
  float asp = r.x / r.y;
  vec2 p = vec2(uv.x * asp, uv.y);

  /* Night sky: near-black navy, slightly lifted toward the horizon */
  vec3 col = mix(vec3(0.012, 0.035, 0.055), vec3(0.004, 0.010, 0.022), smoothstep(0.0, 1.0, uv.y));

  /* Fabric palette: lime lower edge, mint body, teal and deep teal fading up */
  vec3 lime = vec3(0.66, 0.90, 0.47);
  vec3 mint = vec3(0.24, 0.82, 0.62);
  vec3 teal = vec3(0.07, 0.55, 0.47);
  vec3 deep = vec3(0.02, 0.25, 0.26);

  vec3 glow = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x = p.x * (0.45 + fi * 0.15) + fi * 4.7;
    float base = edge + fi * 0.05 + 0.34 * (fbm(vec2(x, t * 0.03 + fi * 1.7)) - 0.5) + 0.05 * sin(p.x * 2.2 + t * 0.15 + fi);
    float d = p.y - base;
    float rays = 0.35 + 0.65 * fbm(vec2(p.x * (10.0 + fi * 3.0) + fi * 9.0, t * 0.12));
    float fold = smoothstep(0.32, 0.72, fbm(vec2(p.x * 1.3 - t * 0.02 + fi * 2.3, fi)));
    float lower = smoothstep(-0.02, 0.015, d);
    float body = exp(-max(d, 0.0) * (3.2 + fi * 1.6));
    float w = lower * body * rays * fold * (0.95 - fi * 0.25);
    vec3 c = mix(lime, mint, smoothstep(0.0, 0.06, d));
    c = mix(c, teal, smoothstep(0.05, 0.22, d));
    c = mix(c, deep, smoothstep(0.2, 0.5, d));
    glow += c * w;
  }
  /* Soft haze under the curtains */
  glow += teal * 0.10 * exp(-abs(p.y - edge) * 5.0) * fbm(vec2(p.x * 0.7, t * 0.02));

  col += glow * amp;

  /* Stars: fill the dark sky, fade out where the aurora is bright, drift slightly on scroll */
  if (stars > 0.5) {
    float bright = dot(glow * amp, vec3(0.3, 0.5, 0.2));
    float clear = 1.0 - smoothstep(0.04, 0.3, bright);
    float horizon = 0.6 + 0.4 * smoothstep(0.0, 0.5, uv.y);
    float faint = starLayer(gl_FragCoord.xy - vec2(0.0, sy * 0.25), 5.0, 0.07, 0.0) * 0.7;
    float lit = starLayer(gl_FragCoord.xy - vec2(0.0, sy * 0.5), 16.0, 0.16, 17.0) * 1.5;
    col += vec3(0.84, 0.92, 1.0) * (faint + lit) * clear * horizon;
  }
  col = 1.0 - exp(-col * 1.35);   /* gentle tone map */
  gl_FragColor = vec4(col, 1.0);
}`;

  function start(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) { canvas.classList.add('aurora--fallback'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.classList.add('aurora--fallback'); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    const uR = u('r'), uT = u('t'), uAmp = u('amp'), uSy = u('sy');
    const baseAmp = parseFloat(canvas.dataset.amp || '1');
    gl.uniform1f(u('edge'), parseFloat(canvas.dataset.edge || '0.55'));
    gl.uniform1f(uAmp, baseAmp);
    gl.uniform1f(u('stars'), canvas.dataset.stars === '0' ? 0 : 1);

    // Page sky (data-scroll): brightest on the first screen, dimmer behind the content
    // below, and the curtains drift faster while the visitor scrolls.
    const follows = canvas.dataset.scroll === '1';
    let lastY = window.scrollY, drift = 0;
    const scrollState = () => {
      if (!follows) return;
      const y = window.scrollY;
      drift += Math.min(Math.abs(y - lastY), 200) * 0.0012;
      lastY = y;
      const progress = Math.min(y / window.innerHeight, 1);
      gl.uniform1f(uSy, y * scale);
      gl.uniform1f(uAmp, baseAmp * (1 - 0.38 * progress));
    };

    // Render at reduced resolution: the aurora is soft, so this is invisible and cheap.
    const scale = 0.5;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(uR, w, h);
    };
    const draw = (ms) => { resize(); scrollState(); gl.uniform1f(uT, 20 + ms / 1000 + drift); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };

    let visible = true, raf = 0;
    const loop = (ms) => { draw(ms); raf = visible ? requestAnimationFrame(loop) : 0; };
    if (reduce) {
      // Still image: one frame, redrawn only when the size changes.
      if (follows) gl.uniform1f(uAmp, baseAmp * 0.8);
      const still = () => { resize(); gl.uniform1f(uT, 28); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
      still(); window.addEventListener('resize', still); return;
    }
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(canvas);
    raf = requestAnimationFrame(loop);
  }

  document.querySelectorAll('canvas.aurora').forEach(start);
})();
