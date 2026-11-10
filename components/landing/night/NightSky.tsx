'use client'

import { useEffect, useRef } from 'react'
import s from './night.module.css'

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'

// One full-screen pass, back to front: sky gradient, a far and a near layer of
// hashed stars, a crescent moon with its halo, slow high cloud, and a touch of
// grain so the dark gradient does not band. Each layer is sampled a share of
// the scroll (`sc`, px) further down, so the far ones leave the screen slowest,
// and a smaller share of the pointer (`m`): that is the parallax.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;
uniform float t;
uniform vec2 m;
uniform float sc;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+17.3;a*=.5;}return v;}
float stars(vec2 fc,float cell,float rare,float gain){
  vec2 g=fc/cell;
  vec2 id=floor(g);
  float k=h(id);
  float sz=h(id+11.3);
  vec2 o=vec2(h(id+3.1),h(id+7.7))-.5;
  float d=length(fract(g)-.5-o*.7);
  float tw=.62+.38*sin(t*(.5+k*1.8)+k*40.);
  return step(rare,k)*smoothstep(.03+.065*sz*sz,0.,d)*(.55+.65*sz)*tw*gain;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec2 uv=fc/r;
  // The lightest band sits a fifth of the way up, where the ground begins.
  float y=max(uv.y-.2,0.)/.8;
  vec3 c=mix(vec3(.145,.125,.32),vec3(.051,.071,.184),smoothstep(0.,.45,y));
  c=mix(c,vec3(.016,.024,.071),smoothstep(.3,1.,y));
  vec2 pc=(fc+vec2(m.x*46.,sc*.3+m.y*46.))/r.y;
  float cl=fbm(vec2(pc.x*1.25+t*.01,pc.y*2.8-t*.003));
  cl=smoothstep(.5,.9,cl)*smoothstep(.1,.5,y);
  float st=stars(fc+vec2(m.x*8.,sc*.8+m.y*8.),30.,.86,.7)
          +stars(fc+vec2(m.x*22.,sc*.55+m.y*22.),21.,.9,1.);
  float R=min(r.x,r.y)*.034;
  vec2 mp=r.x>r.y?vec2(r.x*.455,r.y-108.):vec2(r.x*.84,r.y-104.);
  mp-=vec2(m.x*14.,m.y*14.+sc*.65);
  float md=distance(fc,mp);
  float disc=smoothstep(R,R-1.5,md);
  float moon=disc*smoothstep(R*.9,R*.9+1.5,distance(fc,mp+vec2(R*.5,R*.28)));
  float halo=exp(-md/(R*2.2))*.22+exp(-md/(R*9.))*.06;
  c+=st*smoothstep(.14,.6,y)*(1.-min(cl*1.6,1.))*(1.-disc)*vec3(.9,.92,1.);
  c+=vec3(1.,.93,.82)*(moon+halo*(1.-moon));
  c+=cl*vec3(.055,.065,.14);
  c+=(h(fc+fract(t))-.5)/200.;
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
    const uS = gl.getUniformLocation(prog, 'sc')

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let onScreen = true
    let mx = 0
    let my = 0
    let cx = 0
    let cy = 0

    const draw = (now: number) => {
      raf = 0
      // ponytail: 1x backing store; the sky is soft, so retina would only cost
      // battery. It stops drawing once the hero is off screen.
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
      gl.uniform1f(uS, still ? 0 : window.scrollY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!still && onScreen && !document.hidden) raf = requestAnimationFrame(draw)
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw)
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
    window.addEventListener('resize', kick)
    document.addEventListener('visibilitychange', kick)
    kick()
    canvas.dataset.on = ''

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', kick)
      document.removeEventListener('visibilitychange', kick)
    }
  }, [])

  return <canvas ref={ref} className={s.sky} aria-hidden="true" />
}
