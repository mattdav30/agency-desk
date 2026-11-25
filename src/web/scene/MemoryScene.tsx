import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Props = { names: string[]; onOpen: (name: string) => void; mobile: boolean; reduced: boolean };

const AMBER = new THREE.Color("#f2a93b");
const BLUE = new THREE.Color("#6ea8fe");

function Orb({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const pts = useRef<THREE.Points>(null);
  const core = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const n = mobile ? 700 : 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Even spread over a shell, with a little depth so the orb feels dense.
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const r = 0.62 + Math.random() * 0.18, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [mobile]);
  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    if (pts.current) { pts.current.rotation.y = t * 0.25; pts.current.rotation.x = Math.sin(t * 0.3) * 0.2; }
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
  });
  return (
    <group>
      <points ref={pts} geometry={geo}>
        <pointsMaterial color={AMBER} size={mobile ? 0.034 : 0.026} sizeAttenuation transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <mesh ref={core}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Constellation({ names, onOpen, mobile, reduced }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const lineGeo = useRef<THREE.BufferGeometry>(null);
  const pulseGeo = useRef<THREE.BufferGeometry>(null);
  const pulseT = useRef<number[]>([]);

  const orbits = useMemo(
    () => names.map((name, i) => ({
      name, inbox: name === "Inbox",
      r: 2.5 + (i % 3) * 0.75, speed: 0.1 + (i % 4) * 0.035, phase: i * 2.4,
      tilt: (((i * 37) % 70) - 35) * (Math.PI / 180),
    })),
    [names],
  );
  const pulsesPer = mobile ? 0 : 2;
  const linePos = useMemo(() => new Float32Array(orbits.length * 6), [orbits]);
  const pulsePos = useMemo(() => new Float32Array(orbits.length * pulsesPer * 3), [orbits, pulsesPer]);
  if (pulseT.current.length !== orbits.length * pulsesPer) pulseT.current = Array.from({ length: orbits.length * pulsesPer }, (_, i) => (i * 0.37) % 1);

  const place = (o: (typeof orbits)[number], t: number) => {
    const a = o.phase + t * o.speed;
    const x = o.r * Math.cos(a), z0 = o.r * Math.sin(a);
    return [x, z0 * Math.sin(o.tilt), z0 * Math.cos(o.tilt)] as const;
  };

  useFrame(({ clock }, dt) => {
    const t = reduced ? 0 : clock.elapsedTime;
    orbits.forEach((o, i) => {
      const [x, y, z] = place(o, t);
      nodeRefs.current[i]?.position.set(x, y, z);
      linePos.set([0, 0, 0, x, y, z], i * 6);
      for (let k = 0; k < pulsesPer; k++) {
        const idx = i * pulsesPer + k;
        if (!reduced) pulseT.current[idx] = (pulseT.current[idx] + dt * (0.22 + (i % 3) * 0.06)) % 1;
        const p = pulseT.current[idx];
        pulsePos.set([x * p, y * p, z * p], idx * 3);
      }
    });
    if (lineGeo.current) lineGeo.current.attributes.position.needsUpdate = true;
    if (pulseGeo.current && pulsesPer) pulseGeo.current.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments>
        <bufferGeometry ref={lineGeo}>
          <bufferAttribute attach="attributes-position" array={linePos} count={orbits.length * 2} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={BLUE} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {pulsesPer > 0 && (
        <points>
          <bufferGeometry ref={pulseGeo}>
            <bufferAttribute attach="attributes-position" array={pulsePos} count={orbits.length * pulsesPer} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial color="#ffffff" size={0.07} sizeAttenuation transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
      )}

      {orbits.map((o, i) => (
        <mesh key={`ring${o.name}`} rotation={[Math.PI / 2 + o.tilt, 0, 0]}>
          <torusGeometry args={[o.r, 0.003, 6, mobile ? 64 : 128]} />
          <meshBasicMaterial color={BLUE} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}

      {orbits.map((o, i) => {
        const on = hover === o.name;
        return (
          <group key={o.name} ref={(el) => { nodeRefs.current[i] = el; }}>
            <mesh
              scale={on ? 1.5 : 1}
              onClick={(e) => { e.stopPropagation(); onOpen(o.name); }}
              onPointerOver={(e) => { e.stopPropagation(); setHover(o.name); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { setHover(null); document.body.style.cursor = ""; }}
            >
              <sphereGeometry args={[0.12, 20, 20]} />
              <meshBasicMaterial color={o.inbox ? AMBER : BLUE} />
            </mesh>
            <mesh scale={on ? 2.2 : 1.6}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshBasicMaterial color={o.inbox ? AMBER : BLUE} transparent opacity={on ? 0.3 : 0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <Html center position={[0, 0.38, 0]} zIndexRange={[10, 0]}>
              <button type="button" className={`node-label ${on ? "on" : ""} ${o.inbox ? "inbox" : ""}`} onClick={() => onOpen(o.name)} onPointerEnter={() => setHover(o.name)} onPointerLeave={() => setHover(null)}>
                {o.name}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Rig({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ pointer }) => {
    if (!g.current || reduced) return;
    g.current.rotation.y += (pointer.x * 0.35 - g.current.rotation.y) * 0.05;
    g.current.rotation.x += (-pointer.y * 0.22 - g.current.rotation.x) * 0.05;
  });
  return <group ref={g}>{children}</group>;
}

export default function MemoryScene(props: Props) {
  const { mobile, reduced } = props;
  return (
    <Canvas
      camera={{ position: [0, 3.6, mobile ? 12 : 8.4], fov: 42 }}
      dpr={mobile ? [1, 1.25] : [1, 2]}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <fog attach="fog" args={["#111317", 9, 19]} />
      <Rig reduced={reduced}>
        <Orb mobile={mobile} reduced={reduced} />
        <Constellation {...props} />
      </Rig>
      <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.08} autoRotate={!reduced} autoRotateSpeed={0.5} rotateSpeed={0.7} minPolarAngle={Math.PI * 0.25} maxPolarAngle={Math.PI * 0.75} />
    </Canvas>
  );
}
