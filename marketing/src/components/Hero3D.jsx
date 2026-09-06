import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Icosahedron, Torus, Octahedron, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// A soft field of drifting points behind the shapes — cheap (one draw call) but reads as
// depth/atmosphere rather than a flat gradient.
function ParticleField() {
    const ref = useRef();
    const positions = useMemo(() => {
        const count = 400;
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 18;
            arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
        }
        return arr;
    }, []);

    useFrame((state) => {
        if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.01;
    });

    return (
        <Points ref={ref} positions={positions} stride={3}>
            <PointMaterial size={0.035} color="#5cc9b8" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
        </Points>
    );
}

function DriftingShape({ position, geometry, color, speed = 1, scale = 1, opacity = 0.4 }) {
    const mesh = useRef();
    useFrame((state) => {
        if (!mesh.current) return;
        const t = state.clock.elapsedTime * speed;
        mesh.current.rotation.x = t * 0.25;
        mesh.current.rotation.y = t * 0.35;
    });

    return (
        <Float speed={speed * 1.2} rotationIntensity={0.4} floatIntensity={1.1}>
            <mesh ref={mesh} position={position} scale={scale}>
                {geometry}
                <meshStandardMaterial color={color} roughness={0.25} metalness={0.35} transparent opacity={opacity} />
            </mesh>
        </Float>
    );
}

function Rig() {
    // Subtle camera parallax that follows the pointer — reads as "alive" without being busy.
    useFrame((state) => {
        state.camera.position.x += (state.pointer.x * 0.6 - state.camera.position.x) * 0.02;
        state.camera.position.y += (state.pointer.y * 0.35 - state.camera.position.y) * 0.02;
        state.camera.lookAt(0, 0, 0);
    });
    return null;
}

export default function Hero3D() {
    return (
        <Canvas
            camera={{ position: [0, 0, 9], fov: 42 }}
            dpr={[1, 1.6]}
            gl={{ antialias: true, alpha: true }}
            style={{ position: 'absolute', inset: 0 }}
        >
            <ambientLight intensity={0.55} />
            <pointLight position={[6, 6, 6]} intensity={1.3} color="#5cc9b8" />
            <pointLight position={[-6, -3, 4]} intensity={0.7} color="#8b93ff" />

            <ParticleField />

            {/* The hero content is a left-text / right-screenshot split (not centered), so
                these are kept small, faint, and far back — soft background atmosphere that
                can't meaningfully compete with the headline or the screenshot frame for
                attention, rather than solid shapes that need pixel-precise dodging. */}
            <DriftingShape position={[-4.2, 2.6, -8]} geometry={<icosahedronGeometry args={[1.15, 0]} />} color="#1f7a6c" speed={0.6} scale={0.4} opacity={0.35} />
            <DriftingShape position={[4.8, -2.2, -9]} geometry={<torusGeometry args={[0.85, 0.28, 16, 64]} />} color="#0f4a41" speed={0.8} scale={0.45} opacity={0.3} />
            <DriftingShape position={[3.2, 2.8, -7.5]} geometry={<octahedronGeometry args={[0.7, 0]} />} color="#5cc9b8" speed={1.1} scale={0.35} opacity={0.35} />

            <Rig />
        </Canvas>
    );
}
