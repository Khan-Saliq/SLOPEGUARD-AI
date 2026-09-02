import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useApp } from '../../hooks/useApp';

function GaugeRing({ value, max, color }: { value: number; max: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const pct = Math.min(value / max, 1);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.elapsedTime * 0.15;
    }
  });

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.08, 16, 64, Math.PI * 2]} />
        <meshStandardMaterial color="#2a2520" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, -Math.PI / 2]} ref={ref}>
        <torusGeometry args={[1, 0.12, 16, 64, Math.PI * 2 * pct]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.4} />
      </mesh>
      <Float speed={1.2} floatIntensity={0.3}>
        <Text position={[0, 0, 0.2]} fontSize={0.55} color="#f5f0e8" anchorX="center" anchorY="middle">
          {value}
        </Text>
      </Float>
    </group>
  );
}

interface RiskGauge3DProps {
  value: number;
  max?: number;
  color: string;
  label: string;
  className?: string;
}

export function RiskGauge3D({ value, max = 10, color, label, className }: RiskGauge3DProps) {
  const { reducedMotion } = useApp();

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[2, 2, 3]} intensity={1} color="#6eb89e" />
        <GaugeRing value={value} max={max} color={color} />
        {!reducedMotion && (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
            <ringGeometry args={[0.55, 0.58, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.25} />
          </mesh>
        )}
      </Canvas>
      <p className="text-center text-[10px] font-medium text-dim mt-1">{label}</p>
    </div>
  );
}
