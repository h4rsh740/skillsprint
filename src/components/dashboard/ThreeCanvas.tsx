"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

export interface Skill {
  id: string;
  name: string;
  category: "Frontend" | "Backend" | "DevOps" | "Database" | "Architecture" | "AI";
  position: [number, number, number];
  description: string;
  resources: { name: string; url: string }[];
  dependencies: string[];
}

export const SKILL_NODES: Skill[] = [
  {
    id: "js",
    name: "JavaScript",
    category: "Frontend",
    position: [-1, 0.5, 0],
    description: "Core scripting language for web functionality, asynchronous operations, and DOM manipulation.",
    resources: [{ name: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" }],
    dependencies: []
  },
  {
    id: "react",
    name: "React.js",
    category: "Frontend",
    position: [-2.5, 2, 0.5],
    description: "Component-based declarative UI library utilizing virtual DOM state updates.",
    resources: [{ name: "Official React Docs", url: "https://react.dev/" }],
    dependencies: ["js"]
  },
  {
    id: "nextjs",
    name: "Next.js",
    category: "Frontend",
    position: [-4.5, 3, 1],
    description: "Production framework supporting Server Actions, server rendering (SSR), and optimization.",
    resources: [{ name: "Next.js Documentation", url: "https://nextjs.org/docs" }],
    dependencies: ["react"]
  },
  {
    id: "css",
    name: "CSS / HTML",
    category: "Frontend",
    position: [-3.5, -0.5, -0.5],
    description: "Styling sheets, flex layouts, responsive grid patterns, and semantic page layouts.",
    resources: [{ name: "MDN HTML & CSS", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" }],
    dependencies: []
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    category: "Frontend",
    position: [-5.5, 1, 0],
    description: "Utility-first CSS framework for rapid responsive layouts and glassmorphism styling.",
    resources: [{ name: "Tailwind Documentation", url: "https://tailwindcss.com/docs" }],
    dependencies: ["css"]
  },
  {
    id: "nodejs",
    name: "Node.js",
    category: "Backend",
    position: [1.5, 1, 0.5],
    description: "V8 server runtime executing server APIs, handling event loops, and middleware routing.",
    resources: [{ name: "Node.js Official Documentation", url: "https://nodejs.org/docs" }],
    dependencies: ["js"]
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "Database",
    position: [3.5, 2, -0.5],
    description: "Relational database utilizing SQL joins, schema migrations, and indexing optimizations.",
    resources: [{ name: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/" }],
    dependencies: ["nodejs"]
  },
  {
    id: "redis",
    name: "Redis Caching",
    category: "Database",
    position: [3.5, -0.5, 1],
    description: "In-memory data store supporting key-value records, token caches, and WebSocket pub/sub backplanes.",
    resources: [{ name: "Redis Official Docs", url: "https://redis.io/docs/" }],
    dependencies: ["nodejs"]
  },
  {
    id: "docker",
    name: "Docker Containers",
    category: "DevOps",
    position: [1, -2, -0.5],
    description: "Containerization engine packaging execution layers, environment configs, and dev environments.",
    resources: [{ name: "TechWorld with Nana Docker", url: "https://www.youtube.com/watch?v=3c-iKn5qWXg" }],
    dependencies: ["nodejs"]
  },
  {
    id: "aws",
    name: "AWS Cloud",
    category: "DevOps",
    position: [2.5, -3.5, 0],
    description: "Cloud computing services (S3 buckets, EC2 virtual boxes, RDS, Serverless Lambda).",
    resources: [{ name: "AWS Cloud Practitioner Course", url: "https://www.youtube.com/watch?v=SOTamWGuqXs" }],
    dependencies: ["docker"]
  },
  {
    id: "systemdesign",
    name: "System Design",
    category: "Architecture",
    position: [0, 3.5, -1],
    description: "System engineering: load balancing, microservice patterns, gateway proxies, and database partitioning.",
    resources: [{ name: "ByteByteGo Architecture Guide", url: "https://www.youtube.com/watch?v=i53Gi_K397I" }],
    dependencies: ["aws"]
  },
  {
    id: "python",
    name: "Python",
    category: "Backend",
    position: [4, 4, 0.5],
    description: "Core backend language for data engineering, algorithm architectures, and machine learning scripts.",
    resources: [{ name: "Real Python Tutorials", url: "https://realpython.com/" }],
    dependencies: []
  },
  {
    id: "ai",
    name: "Generative AI / RAG",
    category: "AI",
    position: [6, 3, 1],
    description: "Semantic searches using vector databases, LLM prompt templates, and LangChain model pipelines.",
    resources: [{ name: "Gemini API Overview", url: "https://ai.google.dev/gemini-api/docs" }],
    dependencies: ["python"]
  }
];

interface NodeProps {
  node: Skill;
  hasSkill: boolean;
  onSelect: (node: Skill) => void;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
}

function FloatingNode({ node, hasSkill, onSelect, hoveredNode, setHoveredNode }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [localHover, setLocalHover] = useState(false);
  const randomSeed = useMemo(() => Math.random() * 10, []);

  // Float animation inside useFrame
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y = node.position[1] + Math.sin(time + randomSeed) * 0.15;
      meshRef.current.position.x = node.position[0] + Math.cos(time * 0.8 + randomSeed) * 0.08;
    }
  });

  const isHighlighted = hoveredNode === node.id || localHover;

  // Visual tokens: Emerald for acquired, Amber for missing
  const color = hasSkill ? "#10b981" : "#f59e0b";
  const glowIntensity = isHighlighted ? 1.5 : 0.6;
  const radius = isHighlighted ? 0.35 : 0.25;

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setLocalHover(true);
          setHoveredNode(node.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setLocalHover(false);
          setHoveredNode(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glowIntensity}
          roughness={0.1}
          metalness={0.9}
        />
        
        {/* Render text directly in 3D scene above node */}
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.22}
          color="#1e293b"
          font="https://fonts.gstatic.com/s/plusjakartasans/v8/L0x5DFM5be_27DYNUxqySS-m2c85.woff"
          anchorX="center"
          anchorY="middle"
        >
          {node.name}
        </Text>
      </mesh>
    </group>
  );
}

interface ThreeCanvasProps {
  userSkills: string[];
  onSelectSkill: (node: Skill) => void;
}

export default function ThreeCanvas({ userSkills, onSelectSkill }: ThreeCanvasProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Normalize user skills list
  const skillsSet = useMemo(() => {
    return new Set(userSkills.map((s) => s.toLowerCase().trim()));
  }, [userSkills]);

  // Compute connecting lines based on node positions
  const connections = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number]; key: string }[] = [];
    SKILL_NODES.forEach((node) => {
      node.dependencies.forEach((depId) => {
        const parent = SKILL_NODES.find((p) => p.id === depId);
        if (parent) {
          lines.push({
            start: node.position,
            end: parent.position,
            key: `${node.id}-${parent.id}`
          });
        }
      });
    });
    return lines;
  }, []);

  return (
    <div className="w-full h-full min-h-[500px]">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Orbit Controls */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={true}
          maxDistance={15}
          minDistance={3}
        />
        
        {/* Draw Neon Dependency Lines */}
        {connections.map((conn) => (
          <Line
            key={conn.key}
            points={[conn.start, conn.end]}
            color="#6366f1"
            lineWidth={1.2}
            opacity={0.4}
            transparent
          />
        ))}

        {/* Draw Skill Nodes */}
        {SKILL_NODES.map((node) => {
          // Check if candidate has this skill in profile
          const hasSkill = skillsSet.has(node.name.toLowerCase().trim()) || 
                           skillsSet.has(node.id.toLowerCase().trim());
          return (
            <FloatingNode
              key={node.id}
              node={node}
              hasSkill={hasSkill}
              onSelect={onSelectSkill}
              hoveredNode={hoveredNode}
              setHoveredNode={setHoveredNode}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
