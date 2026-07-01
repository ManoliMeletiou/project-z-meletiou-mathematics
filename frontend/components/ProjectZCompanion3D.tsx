'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export type CompanionMotionMode = 'idle' | 'celebrate' | 'thinking' | 'encourage' | 'studio';

type CompanionPalette = {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  eye: string;
};

type ProjectZCompanion3DProps = {
  stage?: number;
  skinKey?: string | null;
  auraKey?: string | null;
  mode?: CompanionMotionMode;
  interactive?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  title?: string;
};

function clampStage(stage?: number) {
  return Math.max(1, Math.min(5, Number(stage || 1)));
}

function paletteFor(stage: number, skinKey?: string | null, auraKey?: string | null): CompanionPalette {
  const key = `${skinKey || ''} ${auraKey || ''}`.toLowerCase();

  if (key.includes('quasar') || key.includes('legend') || stage >= 5) {
    return { primary: '#c084fc', secondary: '#22d3ee', accent: '#facc15', glow: '#a855f7', eye: '#fef9c3' };
  }

  if (key.includes('orbit') || key.includes('emerald') || stage >= 4) {
    return { primary: '#34d399', secondary: '#22d3ee', accent: '#a7f3d0', glow: '#10b981', eye: '#ecfeff' };
  }

  if (key.includes('pulse') || key.includes('solar') || stage >= 3) {
    return { primary: '#38bdf8', secondary: '#818cf8', accent: '#fb7185', glow: '#0ea5e9', eye: '#ffffff' };
  }

  if (key.includes('nova') || key.includes('rare') || stage >= 2) {
    return { primary: '#60a5fa', secondary: '#a78bfa', accent: '#f0abfc', glow: '#3b82f6', eye: '#ffffff' };
  }

  return { primary: '#67e8f9', secondary: '#93c5fd', accent: '#c4b5fd', glow: '#06b6d4', eye: '#ffffff' };
}

function companionLabel(stage: number, mode: CompanionMotionMode) {
  if (mode === 'celebrate') return `Stage ${stage} companion celebrating progress`;
  if (mode === 'thinking') return `Stage ${stage} companion thinking with you`;
  if (mode === 'encourage') return `Stage ${stage} companion encouraging today's learning`;
  if (mode === 'studio') return `Stage ${stage} interactive companion preview`;
  return `Stage ${stage} animated learning companion`;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function CompanionCore({
  stage,
  skinKey,
  auraKey,
  mode,
  reducedMotion
}: {
  stage: number;
  skinKey?: string | null;
  auraKey?: string | null;
  mode: CompanionMotionMode;
  reducedMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.Group>(null);
  const palette = useMemo(() => paletteFor(stage, skinKey, auraKey), [stage, skinKey, auraKey]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const speed = mode === 'celebrate' ? 1.7 : mode === 'thinking' ? 0.45 : mode === 'encourage' ? 0.65 : 0.85;

    if (root.current) {
      root.current.rotation.y = reducedMotion ? 0.18 : Math.sin(t * 0.35) * 0.28 + t * 0.08 * speed;
      root.current.position.y = reducedMotion ? 0 : Math.sin(t * 1.4) * 0.09;
      const pulse = mode === 'celebrate' && !reducedMotion ? Math.sin(t * 7) * 0.045 : 0;
      const scale = 1 + (stage - 1) * 0.035 + pulse;
      root.current.scale.setScalar(scale);
    }

    if (rings.current && !reducedMotion) {
      rings.current.rotation.x = t * 0.32 * speed;
      rings.current.rotation.y = t * 0.48 * speed;
      rings.current.rotation.z = Math.sin(t * 0.7) * 0.18;
    }

    if (sparks.current && !reducedMotion) {
      sparks.current.rotation.y = -t * 0.55 * speed;
      sparks.current.rotation.z = Math.sin(t * 0.6) * 0.18;
    }
  });

  const floatIntensity = reducedMotion ? 0 : mode === 'celebrate' ? 1.1 : mode === 'studio' ? 0.7 : 0.45;
  const rotationIntensity = reducedMotion ? 0 : mode === 'thinking' ? 0.18 : 0.34;

  return (
    <group ref={root}>
      <Float speed={1.4} rotationIntensity={rotationIntensity} floatIntensity={floatIntensity} floatingRange={[-0.08, 0.08]}>
        <group>
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.94, 64, 64]} />
            <meshStandardMaterial color={palette.primary} emissive={palette.glow} emissiveIntensity={0.28 + stage * 0.045} roughness={0.28} metalness={0.18} />
          </mesh>

          <mesh position={[0, -0.42, -0.06]} scale={[1.05, 0.56, 0.88]}>
            <sphereGeometry args={[0.82, 48, 48]} />
            <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={0.16} roughness={0.36} metalness={0.08} />
          </mesh>

          <mesh position={[-0.27, 0.18, 0.82]}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <meshStandardMaterial color={palette.eye} emissive={palette.eye} emissiveIntensity={0.9} roughness={0.18} />
          </mesh>
          <mesh position={[0.27, 0.18, 0.82]}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <meshStandardMaterial color={palette.eye} emissive={palette.eye} emissiveIntensity={0.9} roughness={0.18} />
          </mesh>

          <mesh position={[0, -0.04, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.19, 0.012, 12, 64, Math.PI]} />
            <meshStandardMaterial color={palette.eye} emissive={palette.eye} emissiveIntensity={0.58} />
          </mesh>

          <group ref={rings}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.26, 0.018, 18, 128]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.62} transparent opacity={0.82} />
            </mesh>
            {stage >= 2 && (
              <mesh rotation={[1.2, 0.24, 0.48]}>
                <torusGeometry args={[1.46, 0.012, 18, 128]} />
                <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={0.46} transparent opacity={0.58} />
              </mesh>
            )}
            {stage >= 4 && (
              <mesh rotation={[0.75, 0.58, -0.32]}>
                <torusGeometry args={[1.72, 0.01, 18, 128]} />
                <meshStandardMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={0.38} transparent opacity={0.5} />
              </mesh>
            )}
          </group>

          <group ref={sparks}>
            {Array.from({ length: 4 + stage }).map((_, index) => {
              const angle = (index / (4 + stage)) * Math.PI * 2;
              const radius = 1.42 + (index % 3) * 0.18;
              const y = -0.42 + (index % 4) * 0.28;
              return (
                <mesh key={index} position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
                  <sphereGeometry args={[0.035 + stage * 0.003, 16, 16]} />
                  <meshStandardMaterial color={index % 2 ? palette.accent : palette.secondary} emissive={index % 2 ? palette.accent : palette.secondary} emissiveIntensity={0.9} />
                </mesh>
              );
            })}
          </group>

          {stage >= 3 && (
            <mesh position={[0, 1.04, 0]} rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.75} roughness={0.16} metalness={0.2} />
            </mesh>
          )}

          {stage >= 5 && (
            <mesh position={[0, 0, -0.08]}>
              <sphereGeometry args={[1.38, 64, 64]} />
              <meshBasicMaterial color={palette.glow} transparent opacity={0.08} />
            </mesh>
          )}
        </group>
      </Float>
    </group>
  );
}

function CompanionFallback({ stage, title }: { stage: number; title?: string }) {
  return (
    <div className="pz-companion-3d-fallback" aria-label={`Fallback companion preview for stage ${stage}`}>
      <span>{stage >= 5 ? '🌌' : stage >= 4 ? '☄️' : stage >= 3 ? '🪐' : stage >= 2 ? '🌟' : '✨'}</span>
      <strong>{title || `Stage ${stage} companion`}</strong>
    </div>
  );
}

export function ProjectZCompanion3D({
  stage = 1,
  skinKey,
  auraKey,
  mode = 'idle',
  interactive = false,
  compact = false,
  showLabel = false,
  title
}: ProjectZCompanion3DProps) {
  const safeStage = clampStage(stage);
  const reducedMotion = useReducedMotion();
  const label = title || companionLabel(safeStage, mode);

  return (
    <div
      className={`pz-companion-3d-frame ${compact ? 'pz-companion-3d-compact' : ''} pz-companion-3d-${mode}`}
      aria-label={label}
    >
      <div className="pz-companion-3d-canvas-wrap">
        <Suspense fallback={<CompanionFallback stage={safeStage} title={title} />}>
          <Canvas
            className="pz-companion-3d-canvas"
            camera={{ position: [0, 0.28, 5.1], fov: 42 }}
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[2.6, 3.8, 4.6]} intensity={1.45} />
            <pointLight position={[-2.2, 1.7, 2.8]} intensity={0.9} color="#a78bfa" />
            <CompanionCore
              stage={safeStage}
              skinKey={skinKey}
              auraKey={auraKey}
              mode={mode}
              reducedMotion={reducedMotion}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              enableRotate={interactive}
              autoRotate={!reducedMotion && !interactive}
              autoRotateSpeed={mode === 'celebrate' ? 2.25 : 0.8}
            />
          </Canvas>
        </Suspense>
      </div>
      <div className="pz-companion-3d-shadow" />
      {showLabel && <p className="muted pz-companion-3d-label">{label}</p>}
    </div>
  );
}

