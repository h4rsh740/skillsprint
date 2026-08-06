"use client";

import dynamic from "next/dynamic";
import React from "react";

const ShaderCanvas = dynamic(
  async () => {
    const mod = await import("shaders/react");
    const { Shader, ChromaFlow, FilmGrain, FlutedGlass, Swirl } = mod;

    return function ShaderBackground() {
      return (
        <Shader>
          <Swirl colorA="#ffffff" colorB="#e0e7ff" detail={1.7} />
          <ChromaFlow baseColor="#ffffff" downColor="#4f46e5" leftColor="#3b82f6" rightColor="#8b5cf6" upColor="#6366f1" momentum={13} radius={3.5} />
          <FlutedGlass aberration={0.61} angle={31} frequency={8} highlight={0.12} highlightSoftness={0} lightAngle={-90} refraction={4} shape="rounded" softness={1} speed={0.15} />
          <FilmGrain strength={0.05} />
        </Shader>
      );
    };
  },
  {
    ssr: false,
    loading: () => null,
  }
);

export function DynamicShaderBackground() {
  return <ShaderCanvas />;
}
