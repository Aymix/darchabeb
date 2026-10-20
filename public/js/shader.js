/**
 * VirtuArts — Animated Shader Background
 * Ported from React to vanilla ES6 for Symfony/Twig integration.
 * Original shader by Matthias Hurrle (@atzedent)
 *
 * Usage: <canvas data-shader class="shader-canvas"></canvas>
 */

(function () {
  'use strict';

  // ── GLSL Shader Source ──
  const VERTEX_SRC = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

  const FRAGMENT_SRC = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(in vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}return t;}
float clouds(vec2 p){float d=1.,t=.0;for(float i=.0;i<3.;i++){float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);t=mix(t,d,a);d=a;p*=2./(i+1.);}return t;}
void main(void){
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for(float i=1.;i<12.;i++){
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`;

  // ── WebGL Renderer ──
  class ShaderRenderer {
    constructor(canvas, scale) {
      this.canvas = canvas;
      this.scale = scale;
      this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
      if (!this.gl) {
        console.warn('WebGL2 not supported');
        return;
      }
      this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
      this.program = null;
      this.vs = null;
      this.fs = null;
      this.buffer = null;
      this.mouseMove = [0, 0];
      this.mouseCoords = [0, 0];
      this.pointerCoords = [0, 0];
      this.nbrOfPointers = 0;
      this.vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
    }

    compile(shader, source) {
      const gl = this.gl;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      }
    }

    setup() {
      const gl = this.gl;
      if (!gl) return;
      this.vs = gl.createShader(gl.VERTEX_SHADER);
      this.fs = gl.createShader(gl.FRAGMENT_SHADER);
      this.compile(this.vs, VERTEX_SRC);
      this.compile(this.fs, FRAGMENT_SRC);
      this.program = gl.createProgram();
      gl.attachShader(this.program, this.vs);
      gl.attachShader(this.program, this.fs);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(this.program));
      }
    }

    init() {
      const gl = this.gl;
      if (!gl || !this.program) return;
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(this.program, 'position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      this.uniforms = {
        resolution: gl.getUniformLocation(this.program, 'resolution'),
        time: gl.getUniformLocation(this.program, 'time'),
        move: gl.getUniformLocation(this.program, 'move'),
        touch: gl.getUniformLocation(this.program, 'touch'),
        pointerCount: gl.getUniformLocation(this.program, 'pointerCount'),
        pointers: gl.getUniformLocation(this.program, 'pointers'),
      };
    }

    updateScale(s) {
      this.scale = s;
      if (this.gl) this.gl.viewport(0, 0, this.canvas.width * s, this.canvas.height * s);
    }
    updateMouse(c) { this.mouseCoords = c; }
    updateMove(m) { this.mouseMove = m; }
    updatePointerCoords(c) { this.pointerCoords = c; }
    updatePointerCount(n) { this.nbrOfPointers = n; }

    render(now) {
      const gl = this.gl;
      if (!gl || !this.program) return;
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.time, now * 1e-3);
      gl.uniform2f(this.uniforms.move, this.mouseMove[0], this.mouseMove[1]);
      gl.uniform2f(this.uniforms.touch, this.mouseCoords[0], this.mouseCoords[1]);
      gl.uniform1i(this.uniforms.pointerCount, this.nbrOfPointers);
      gl.uniform2fv(this.uniforms.pointers, this.pointerCoords);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    reset() {
      const gl = this.gl;
      if (!gl || !this.program) return;
      if (this.vs) { gl.detachShader(this.program, this.vs); gl.deleteShader(this.vs); }
      if (this.fs) { gl.detachShader(this.program, this.fs); gl.deleteShader(this.fs); }
      gl.deleteProgram(this.program);
    }
  }

  // ── Pointer Handler ──
  class PointerHandler {
    constructor(el, scale) {
      this.scale = scale;
      this.active = false;
      this.pointers = new Map();
      this.lastCoords = [0, 0];
      this.moves = [0, 0];
      const map = (x, y) => [x * this.scale, el.height - y * this.scale];

      el.addEventListener('pointerdown', (e) => {
        this.active = true;
        this.pointers.set(e.pointerId, map(e.clientX, e.clientY));
      });
      el.addEventListener('pointerup', (e) => {
        if (this.count === 1) this.lastCoords = this.first;
        this.pointers.delete(e.pointerId);
        this.active = this.pointers.size > 0;
      });
      el.addEventListener('pointerleave', (e) => {
        if (this.count === 1) this.lastCoords = this.first;
        this.pointers.delete(e.pointerId);
        this.active = this.pointers.size > 0;
      });
      el.addEventListener('pointermove', (e) => {
        if (!this.active) return;
        this.lastCoords = [e.clientX, e.clientY];
        this.pointers.set(e.pointerId, map(e.clientX, e.clientY));
        this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY];
      });
    }

    updateScale(s) { this.scale = s; }
    get count() { return this.pointers.size; }
    get move() { return this.moves; }
    get coords() { return this.pointers.size > 0 ? Array.from(this.pointers.values()).flat() : [0, 0]; }
    get first() { return this.pointers.values().next().value || this.lastCoords; }
  }

  // ── Auto-Init ──
  function initShader(canvas) {
    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    const renderer = new ShaderRenderer(canvas, dpr);
    if (!renderer.gl) return;
    const pointers = new PointerHandler(canvas, dpr);

    renderer.setup();
    renderer.init();

    const resize = () => {
      const d = Math.max(1, 0.5 * window.devicePixelRatio);
      canvas.width = canvas.offsetWidth * d;
      canvas.height = canvas.offsetHeight * d;
      renderer.updateScale(d);
      pointers.updateScale(d);
    };

    const loop = (now) => {
      renderer.updateMouse(pointers.first);
      renderer.updatePointerCount(pointers.count);
      renderer.updatePointerCoords(pointers.coords);
      renderer.updateMove(pointers.move);
      renderer.render(now);
      canvas._raf = requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    loop(0);

    // Cleanup helper
    canvas._cleanup = () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(canvas._raf);
      renderer.reset();
    };
  }

  // Init all shader canvases on DOM ready
  function boot() {
    document.querySelectorAll('canvas[data-shader]').forEach(initShader);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
