'use client';

import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Torus, Box } from '@react-three/drei';
import { motion } from 'framer-motion';

export function Statistical3D() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.15} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#7C3AED" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#8B5CF6" />
        <pointLight position={[0, 5, 5]} intensity={0.8} color="#A78BFA" />

        {/* 3D Bar Chart */}
        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.2}>
          <Box args={[0.5, 2, 0.5]} position={[-4, 0, -5]} scale={1}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.1}
              speed={1.5}
              roughness={0.3}
              metalness={0.7}
              transparent
              opacity={0.4}
            />
          </Box>
        </Float>

        <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.2}>
          <Box args={[0.5, 3, 0.5]} position={[-3, 0.5, -5]} scale={1}>
            <MeshDistortMaterial
              color="#8B5CF6"
              attach="material"
              distort={0.1}
              speed={1.6}
              roughness={0.3}
              metalness={0.7}
              transparent
              opacity={0.45}
            />
          </Box>
        </Float>

        <Float speed={1.6} rotationIntensity={0.2} floatIntensity={0.2}>
          <Box args={[0.5, 1.5, 0.5]} position={[-2, -0.25, -5]} scale={1}>
            <MeshDistortMaterial
              color="#A78BFA"
              attach="material"
              distort={0.1}
              speed={1.7}
              roughness={0.3}
              metalness={0.7}
              transparent
              opacity={0.4}
            />
          </Box>
        </Float>

        <Float speed={1.3} rotationIntensity={0.2} floatIntensity={0.2}>
          <Box args={[0.5, 2.5, 0.5]} position={[-1, 0.25, -5]} scale={1}>
            <MeshDistortMaterial
              color="#C4B5FD"
              attach="material"
              distort={0.1}
              speed={1.8}
              roughness={0.3}
              metalness={0.7}
              transparent
              opacity={0.35}
            />
          </Box>
        </Float>

        {/* 3D Pie Chart Slices */}
        <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.3}>
          <Sphere args={[1, 32, 32, 0, Math.PI / 2]} position={[4, 1, -6]} scale={1.2}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.15}
              speed={2}
              roughness={0.25}
              metalness={0.75}
              transparent
              opacity={0.5}
            />
          </Sphere>
        </Float>

        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
          <Sphere args={[1, 32, 32, 0, Math.PI / 2]} position={[5, 0, -6]} scale={1.2} rotation={[0, 0, Math.PI / 2]}>
            <MeshDistortMaterial
              color="#8B5CF6"
              attach="material"
              distort={0.15}
              speed={2.2}
              roughness={0.25}
              metalness={0.75}
              transparent
              opacity={0.45}
            />
          </Sphere>
        </Float>

        <Float speed={2.2} rotationIntensity={0.3} floatIntensity={0.3}>
          <Sphere args={[1, 32, 32, 0, Math.PI / 2]} position={[6, -1, -6]} scale={1.2} rotation={[0, 0, Math.PI]}>
            <MeshDistortMaterial
              color="#A78BFA"
              attach="material"
              distort={0.15}
              speed={2.4}
              roughness={0.25}
              metalness={0.75}
              transparent
              opacity={0.4}
            />
          </Sphere>
        </Float>

        {/* 3D Line Chart Points */}
        <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.15}>
          <Sphere args={[0.3, 16, 16]} position={[0, 2, -8]} scale={1}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.2}
              speed={1.8}
              roughness={0.2}
              metalness={0.8}
              transparent
              opacity={0.6}
            />
          </Sphere>
        </Float>

        <Float speed={1.7} rotationIntensity={0.15} floatIntensity={0.15}>
          <Sphere args={[0.3, 16, 16]} position={[1.5, 1, -8]} scale={1}>
            <MeshDistortMaterial
              color="#8B5CF6"
              attach="material"
              distort={0.2}
              speed={2}
              roughness={0.2}
              metalness={0.8}
              transparent
              opacity={0.55}
            />
          </Sphere>
        </Float>

        <Float speed={1.9} rotationIntensity={0.15} floatIntensity={0.15}>
          <Sphere args={[0.3, 16, 16]} position={[3, 0, -8]} scale={1}>
            <MeshDistortMaterial
              color="#A78BFA"
              attach="material"
              distort={0.2}
              speed={2.2}
              roughness={0.2}
              metalness={0.8}
              transparent
              opacity={0.5}
            />
          </Sphere>
        </Float>

        <Float speed={2.1} rotationIntensity={0.15} floatIntensity={0.15}>
          <Sphere args={[0.3, 16, 16]} position={[4.5, -1, -8]} scale={1}>
            <MeshDistortMaterial
              color="#C4B5FD"
              attach="material"
              distort={0.2}
              speed={2.4}
              roughness={0.2}
              metalness={0.8}
              transparent
              opacity={0.45}
            />
          </Sphere>
        </Float>

        {/* Floating Torus Rings */}
        <Float speed={2.5} rotationIntensity={0.4} floatIntensity={0.4}>
          <Torus args={[1.5, 0.1, 16, 100]} position={[0, -2, -10]} scale={1}>
            <MeshDistortMaterial
              color="#7C3AED"
              attach="material"
              distort={0.05}
              speed={3}
              roughness={0.1}
              metalness={0.9}
              transparent
              opacity={0.3}
            />
          </Torus>
        </Float>

        <Float speed={2.8} rotationIntensity={0.4} floatIntensity={0.4}>
          <Torus args={[2, 0.1, 16, 100]} position={[0, -2, -10]} scale={1} rotation={[Math.PI / 2, 0, 0]}>
            <MeshDistortMaterial
              color="#8B5CF6"
              attach="material"
              distort={0.05}
              speed={3.2}
              roughness={0.1}
              metalness={0.9}
              transparent
              opacity={0.25}
            />
          </Torus>
        </Float>
      </Canvas>
    </motion.div>
  );
}
