import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = \`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
\`;

const fragmentShader = \`
precision highp float;
varying vec2 vUv;
uniform float time;
uniform vec2 mouse;
uniform float mouseSpeed;

float sphereSDF(vec3 p, float r) {
  return length(p) - r;
}

float sdf(vec3 p, vec2 mouse, float speed) {
  vec3 m = vec3(mouse * 2.0 - 1.0, 0.0);
  float repulse = smoothstep(0.3, 0.0, length(p.xy - m.xy));
  p.xy += normalize(p.xy - m.xy) * repulse * 0.3;

  float d1 = sphereSDF(p - vec3(-0.5, 0.0, 0.0), 0.35);
  float d2 = sphereSDF(p - vec3(0.5, 0.0, 0.0), speed > 0.4 ? 0.25 : 0.0);
  return min(d1, d2);
}

vec3 getNormal(vec3 p, vec2 mouse, float speed) {
  float d = 0.001;
  return normalize(vec3(
    sdf(p + vec3(d, 0.0, 0.0), mouse, speed) - sdf(p - vec3(d, 0.0, 0.0), mouse, speed),
    sdf(p + vec3(0.0, d, 0.0), mouse, speed) - sdf(p - vec3(0.0, d, 0.0), mouse, speed),
    sdf(p + vec3(0.0, 0.0, d), mouse, speed) - sdf(p - vec3(0.0, 0.0, d), mouse, speed)
  ));
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  vec3 camPos = vec3(0.0, 0.0, 3.0);
  vec3 ray = normalize(vec3(uv, -1.0));
  float t = 0.0;
  float dist;

  for (int i = 0; i < 100; i++) {
    vec3 p = camPos + ray * t;
    dist = sdf(p, mouse, mouseSpeed);
    if (dist < 0.01) break;
    t += dist;
  }

  vec3 color;
  if (dist < 0.01) {
    vec3 p = camPos + ray * t;
    vec3 n = getNormal(p, mouse, mouseSpeed);
    float fresnel = pow(1.0 + dot(ray, n), 3.0);
    color = mix(vec3(1.0, 0.5, 1.0), vec3(0.5, 0.8, 1.0), fresnel);
  } else {
    float y = vUv.y;
    vec3 top = vec3(0.4, 0.2, 0.8);
    vec3 mid = vec3(0.2, 0.4, 1.0);
    vec3 bot = vec3(1.0, 0.4, 0.7);
    color = y < 0.5 ? mix(bot, mid, y * 2.0) : mix(mid, top, (y - 0.5) * 2.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
\`;

function ShaderPlane({ mouse, mouseSpeed }) {
  const meshRef = useRef();
  const { size } = useThree();

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    mouse: { value: new THREE.Vector2(0, 0) },
    mouseSpeed: { value: 0 }
  }), []);

  useFrame((state) => {
    uniforms.time.value = state.clock.elapsedTime;
    uniforms.mouse.value = mouse;
    uniforms.mouseSpeed.value = mouseSpeed;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

function App() {
  const [mouse, setMouse] = useState(new THREE.Vector2(0, 0));
  const [prevMouse, setPrevMouse] = useState(new THREE.Vector2(0, 0));
  const [mouseSpeed, setMouseSpeed] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const newMouse = new THREE.Vector2(x, y);
      const speed = newMouse.distanceTo(prevMouse);
      setMouseSpeed(speed);
      setMouse(newMouse);
      setPrevMouse(newMouse);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prevMouse]);

  return (
    <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }}>
      <ShaderPlane mouse={mouse} mouseSpeed={mouseSpeed} />
    </Canvas>
  );
}

export default App;