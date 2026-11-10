'use client'

import { useEffect, useRef } from 'react'
import s from './night.module.css'

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'

// One full-screen pass: sky gradient, slow high cloud, hashed stars, and a
// touch of grain so the dark gradient does not band.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;
uniform float t;
uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+17.3;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=vec2(uv.x*r.x/r.y,uv.y);
  vec3 c=mix(vec3(.145,.125,.32),vec3(.051,.071,.184),smoothstep(0.,.45,uv.y));
  c=mix(c,vec3(.016,.024,.071),smoothstep(.3,1.,uv.y));
  float cl=fbm(vec2(p.x*1.25+t*.01,p.y*2.8-t*.003)+m*.06);
  cl=smoothstep(.5,.9,cl)*smoothstep(.1,.5,uv.y);
  c+=cl*vec3(.055,.065,.14);
  vec2 g=gl_FragCoord.xy/26.+m*.35;
  vec2 id=floor(g);
  float k=h(id);
  float sz=h(id+11.3);
  vec2 o=vec2(h(id+3.1),h(id+7.7))-.5;
  float d=length(fract(g)-.5-o*.7);
  float tw=.62+.38*sin(t*(.5+k*1.8)+k*40.);
  float st=step(.8,k)*smoothstep(.03+.065*sz*sz,0.,d)*(.55+.65*sz)*tw;
  c+=st*smoothstep(.14,.6,uv.y)*(1.-min(cl*1.6,1.))*vec3(.9,.92,1.);
  c+=(h(gl_FragCoord.xy+fract(t))-.5)/200.;
  gl_FragColor=vec4(c,1.);
}`

/**
 * The hero's living sky. Decoration only: the CSS gradient behind the canvas is
 * the page when WebGL is missing or software-rendered, so nothing depends on it.
 * Reduced motion gets a single still frame.
 */
export function NightSky() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    })
    if (!gl) return
    // Chrome can hand out a caveat-passing context that is still software GL
    // (SwiftShader); a full-screen noise pass would pin the CPU there.
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return

    const prog = gl.createProgram()
    for (const [type, src] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, FRAG],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) return
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      gl.attachShader(prog, shader)
    }
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
    const uR = gl.getUniformLocation(prog, 'r')
    const uT = gl.getUniformLocation(prog, 't')
    const uM = gl.getUniformLocation(prog, 'm')

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = -1e3
    let onScreen = true
    let mx = 0
    let my = 0
    let cx = 0
    let cy = 0

    const draw = (now: number) => {
      raf = 0
      // ponytail: 1x backing store at ~30fps; the sky is soft, so retina and
      // 60fps would only cost battery.
      if (now - last >= 32) {
        last = now
        const w = canvas.clientWidth
        const hgt = canvas.clientHeight
        if (canvas.width !== w || canvas.height !== hgt) {
          canvas.width = w
          canvas.height = hgt
          gl.viewport(0, 0, w, hgt)
        }
        cx += (mx - cx) * 0.06
        cy += (my - cy) * 0.06
        gl.uniform2f(uR, w, hgt)
        gl.uniform1f(uT, now / 1000)
        gl.uniform2f(uM, cx, cy)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      if (!still && onScreen && !document.hidden) raf = requestAnimationFrame(draw)
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const redraw = () => {
      last = -1e3
      kick()
    }
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5
      my = 0.5 - e.clientY / window.innerHeight
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) kick()
    })
    io.observe(canvas)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', redraw)
    document.addEventListener('visibilitychange', kick)
    kick()
    canvas.dataset.on = ''

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', redraw)
      document.removeEventListener('visibilitychange', kick)
    }
  }, [])

  return <canvas ref={ref} className={s.sky} aria-hidden="true" />
}
