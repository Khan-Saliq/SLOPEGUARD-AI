import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { RiskZone } from '../../types';
import { RISK_COLORS } from '../../lib/utils';
import { useApp } from '../../hooks/useApp';
import { RainParticles3D } from '../3d/RainParticles3D';

function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(12, 12, 64, 64);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const elevation =
        Math.sin(x * 0.8) * Math.cos(y * 0.6) * 1.5 +
        Math.sin(x * 1.5 + y * 0.5) * 0.8 +
        Math.exp(-((x - 2) ** 2 + (y - 1) ** 2) / 4) * 2.5 +
        Math.exp(-((x + 3) ** 2 + (y + 2) ** 2) / 3) * 2;
      pos.setZ(i, elevation);
      const t = (elevation + 1) / 4;
      colors[i * 3] = 0.15 + t * 0.1;
      colors[i * 3 + 1] = 0.22 + t * 0.15;
      colors[i * 3 + 2] = 0.12 + t * 0.05;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.08 + Math.sin(clock.elapsedTime * 0.5) * 0.04;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.5, 0, 0]}>
      <meshStandardMaterial
        vertexColors
        flatShading
        emissive="#1a2a18"
        emissiveIntensity={0.12}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

function RiskMarker({ zone, index }: { zone: RiskZone; index: number }) {
  const ref = useRef<THREE.Group>(null);
  const color = RISK_COLORS[zone.riskLevel];
  const x = (index % 4 - 1.5) * 2.5;
  const z = (Math.floor(index / 4) - 1) * 2.5;
  const height = zone.riskScore / 30;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = height + Math.sin(clock.elapsedTime * 2 + index) * 0.1;
      ref.current.rotation.y = clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={ref} position={[x, height, z]}>
      <mesh>
        <coneGeometry args={[0.28, height, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} transparent opacity={0.9} />
      </mesh>
      {zone.riskLevel === 'critical' && (
        <mesh position={[0, height / 2 + 0.5, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={0.7} />
        </mesh>
      )}
      <Html distanceFactor={10} position={[0, height + 0.8, 0]} center>
        <div className="whitespace-nowrap rounded bg-card/95 px-2 py-0.5 text-[10px] font-medium text-main border border-border">
          {zone.name.split(' ').slice(0, 2).join(' ')} · {zone.riskScore}
        </div>
      </Html>
    </group>
  );
}

function Scene({ zones, autoRotate, showRain }: { zones: RiskZone[]; autoRotate: boolean; showRain: boolean }) {
  const avgRain = zones.reduce((s, z) => s + z.rainfall, 0) / Math.max(zones.length, 1);

  return (
    <>
      <color attach="background" args={['#12100e']} />
      <fog attach="fog" args={['#12100e', 8, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} color="#f5f0e8" castShadow />
      <pointLight position={[-3, 5, -3]} intensity={0.5} color="#c4845c" />
      <pointLight position={[4, 3, 2]} intensity={0.3} color="#5a9a84" />
      <TerrainMesh />
      {showRain && <RainParticles3D intensity={avgRain / 120} />}
      {zones.slice(0, 6).map((zone, i) => (
        <RiskMarker key={zone.id} zone={zone} index={i} />
      ))}
      <gridHelper args={[12, 24, '#3d3530', '#221e1a']} rotation={[0, 0, 0]} position={[0, -0.01, 0]} />
      <Text position={[0, 4, -6]} fontSize={0.35} color="#8a8078" anchorX="center">
        3D Terrain · Live Risk Markers
      </Text>
      <OrbitControls
        enablePan
        enableZoom
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={autoRotate}
        autoRotateSpeed={0.25}
      />
    </>
  );
}

interface Terrain3DProps {
  zones: RiskZone[];
  className?: string;
  showRain?: boolean;
}

export function Terrain3D({ zones, className, showRain = false }: Terrain3DProps) {
  const { reducedMotion } = useApp();

  return (
    <div className={className}>
      <Canvas camera={{ position: [8, 6, 8], fov: 50 }} shadows>
        <Suspense fallback={null}>
          <Scene zones={zones} autoRotate={!reducedMotion} showRain={showRain} />
        </Suspense>
      </Canvas>
    </div>
  );
}
