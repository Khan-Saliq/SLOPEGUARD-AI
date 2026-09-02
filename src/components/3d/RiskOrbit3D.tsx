import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { RiskLevel } from '../../types';
import { RISK_COLORS } from '../../lib/utils';
import { useApp } from '../../hooks/useApp';

function OrbitingNode({
  level,
  count,
  radius,
  speed,
  y,
}: {
  level: RiskLevel;
  count: number;
  radius: number;
  speed: number;
  y: number;
}) {
  const group = useRef<THREE.Group>(null);
  const color = RISK_COLORS[level];

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * speed;
  });

  return (
    <group ref={group}>
      {Array.from({ length: Math.max(count, 1) }).map((_, i) => {
        const angle = (i / Math.max(count, 1)) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
            <sphereGeometry args={[0.18 + count * 0.02, 16, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

interface RiskOrbit3DProps {
  counts: Record<RiskLevel, number>;
  className?: string;
}

export function RiskOrbit3D({ counts, className }: RiskOrbit3DProps) {
  const { reducedMotion } = useApp();

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 2.5, 4], fov: 50 }}>
        <color attach="background" args={['#12100e']} />
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 4, 2]} intensity={1.2} color="#c4845c" />
        <mesh position={[0, 0, 0]}>
          <icosahedronGeometry args={[0.35, 1]} />
          <meshStandardMaterial color="#3d3530" wireframe />
        </mesh>
        <OrbitingNode level="critical" count={counts.critical} radius={0.9} speed={0.6} y={0.2} />
        <OrbitingNode level="high" count={counts.high} radius={1.35} speed={-0.4} y={-0.1} />
        <OrbitingNode level="moderate" count={counts.moderate} radius={1.75} speed={0.25} y={0.15} />
        <OrbitingNode level="low" count={counts.low} radius={2.15} speed={-0.18} y={-0.05} />
        <OrbitControls enableZoom={false} autoRotate={!reducedMotion} autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
