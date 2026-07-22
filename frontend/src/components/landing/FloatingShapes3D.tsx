'use client';

import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron, Torus, Octahedron } from '@react-three/drei';
import { motion } from 'framer-motion';

export function FloatingShapes3D() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#7C3AED" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#8B5CF6" />
        <pointLight position={[0, 5, 5]} intensity={1} color="#A78BFA" />

        {/* Icosahedron */}
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
          <Icosahedron args={[1, 0]} position={[-3, 2, -2]} scale={0.8}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.3}
              speed={2}
              roughness={0.2}
              metalness={0.8}
              transparent
              opacity={0.6}
            />
          </Icosahedron>
        </Float>

        {/* Torus */}
        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
          <Torus args={[0.8, 0.3, 16, 100]} position={[3, -1, -3]} scale={0.7}>
            <MeshDistortMaterial
              color="#8B5CF6"
              attach="material"
              distort={0.2}
              speed={1.5}
              roughness={0.3}
              metalness={0.7}
              transparent
              opacity={0.5}
            />
          </Torus>
        </Float>

        {/* Octahedron */}
        <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.4}>
          <Octahedron args={[1, 0]} position={[0, 3, -4]} scale={0.6}>
            <MeshDistortMaterial
              color="#A78BFA"
              attach="material"
              distort={0.25}
              speed={1.8}
              roughness={0.25}
              metalness={0.75}
              transparent
              opacity={0.55}
            />
          </Octahedron>
        </Float>

        {/* Second Icosahedron */}
        <Float speed={2.2} rotationIntensity={0.6} floatIntensity={0.6}>
          <Icosahedron args={[0.8, 0]} position={[-2, -2, -5]} scale={0.5}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.35}
              speed={2.2}
              roughness={0.15}
              metalness={0.85}
              transparent
              opacity={0.5}
            />
          </Icosahedron>
        </Float>
      </Canvas>
    </motion.div>
  );
}
