'use client';

import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import { motion } from 'framer-motion';

export function Hero3D() {
  return (
    <motion.div
      className="absolute inset-0 z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#7C3AED" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#8B5CF6" />
        <pointLight position={[0, 5, 5]} intensity={1} color="#A78BFA" />
        <pointLight position={[5, -5, 5]} intensity={0.8} color="#7C3AED" />
        
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
          <Sphere args={[1.5, 64, 64]} scale={2.5}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.6}
              speed={3}
              roughness={0.05}
              metalness={0.95}
              transparent
              opacity={0.7}
            />
          </Sphere>
        </Float>
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </motion.div>
  );
}
