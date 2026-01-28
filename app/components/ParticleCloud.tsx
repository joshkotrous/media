"use client";

import { useRef, useEffect } from "react";

const vertexShader = `
  attribute vec3 a_position;
  attribute float a_size;
  attribute vec3 a_color;
  attribute float a_alpha;
  
  uniform float u_time;
  uniform float u_pixelRatio;
  uniform float u_aspect;
  
  varying vec3 v_color;
  varying float v_alpha;
  
  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    v_color = a_color;
    v_alpha = a_alpha;
    
    vec3 pos = a_position;
    
    // Organic flowing motion using layered noise
    float t = u_time * 0.15;
    
    // Primary swirl
    float noiseScale = 1.5;
    float noise1 = snoise(vec3(pos.x * noiseScale, pos.y * noiseScale, t));
    float noise2 = snoise(vec3(pos.y * noiseScale, pos.z * noiseScale, t + 100.0));
    float noise3 = snoise(vec3(pos.z * noiseScale, pos.x * noiseScale, t + 200.0));
    
    // Secondary detail noise
    float detailNoise1 = snoise(vec3(pos.x * 3.0, pos.y * 3.0, t * 1.5)) * 0.3;
    float detailNoise2 = snoise(vec3(pos.y * 3.0, pos.z * 3.0, t * 1.5 + 50.0)) * 0.3;
    float detailNoise3 = snoise(vec3(pos.z * 3.0, pos.x * 3.0, t * 1.5 + 100.0)) * 0.3;
    
    // Breathing/pulsing effect - radial to maintain sphere shape
    float distFromCenter = length(pos);
    float breathe = sin(u_time * 0.3 + distFromCenter * 3.0) * 0.08;
    vec3 radialDir = normalize(pos + 0.001); // Normalize with small offset to avoid zero
    
    pos.x += (noise1 + detailNoise1) * 0.15;
    pos.y += (noise2 + detailNoise2) * 0.15;
    pos.z += (noise3 + detailNoise3) * 0.15;
    
    // Apply radial breathing
    pos += radialDir * breathe;
    
    // Slow rotation around center
    float angle = u_time * 0.05;
    float cosA = cos(angle);
    float sinA = sin(angle);
    vec3 rotatedPos = vec3(
      pos.x * cosA - pos.z * sinA,
      pos.y,
      pos.x * sinA + pos.z * cosA
    );
    
    // Apply aspect ratio correction to keep sphere circular
    vec2 correctedPos = vec2(rotatedPos.x / u_aspect, rotatedPos.y);
    gl_Position = vec4(correctedPos, 0.0, 1.0);
    
    // Size variation with depth and noise
    float sizeNoise = snoise(vec3(pos.xy * 5.0, u_time * 0.5)) * 0.5 + 0.5;
    float depthFade = smoothstep(-1.0, 1.0, rotatedPos.z) * 0.5 + 0.5;
    gl_PointSize = a_size * u_pixelRatio * (0.5 + sizeNoise * 0.5) * depthFade;
    
    // Fade alpha based on depth
    v_alpha = a_alpha * depthFade * (0.6 + sizeNoise * 0.4);
  }
`;

const fragmentShader = `
  precision highp float;
  
  varying vec3 v_color;
  varying float v_alpha;
  
  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Soft falloff
    float alpha = smoothstep(0.5, 0.0, dist) * v_alpha;
    
    // Slight glow effect
    float glow = exp(-dist * 3.0) * 0.3;
    
    gl_FragColor = vec4(v_color + glow, alpha);
  }
`;

interface ParticleCloudProps {
  particleCount?: number;
  colorScheme?: "aurora" | "sunset" | "ocean" | "cosmic";
  className?: string;
}

export default function ParticleCloud({
  particleCount = 8000,
  colorScheme = "aurora",
  className = "",
}: ParticleCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) return;

    // Resize handler
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Compile shaders
    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vertexShader);
    gl.compileShader(vShader);
    
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", gl.getShaderInfoLog(vShader));
    }

    const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShader, fragmentShader);
    gl.compileShader(fShader);
    
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fShader));
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Color palettes
    const palettes = {
      aurora: [
        [0.2, 0.9, 0.6],   // Cyan-green
        [0.4, 0.8, 0.95],  // Light blue
        [0.6, 0.4, 0.9],   // Purple
        [0.3, 0.95, 0.8],  // Turquoise
        [0.1, 0.6, 0.8],   // Deep teal
      ],
      sunset: [
        [1.0, 0.4, 0.3],   // Coral
        [1.0, 0.6, 0.2],   // Orange
        [0.9, 0.3, 0.5],   // Pink
        [0.7, 0.2, 0.5],   // Magenta
        [1.0, 0.8, 0.3],   // Gold
      ],
      ocean: [
        [0.1, 0.4, 0.8],   // Deep blue
        [0.2, 0.6, 0.9],   // Medium blue
        [0.3, 0.8, 0.9],   // Light blue
        [0.1, 0.5, 0.6],   // Teal
        [0.4, 0.7, 0.8],   // Sky blue
      ],
      cosmic: [
        [0.6, 0.2, 0.8],   // Purple
        [0.3, 0.2, 0.6],   // Deep purple
        [0.8, 0.3, 0.6],   // Magenta
        [0.2, 0.3, 0.8],   // Blue
        [0.9, 0.5, 0.7],   // Pink
      ],
    };

    const colors = palettes[colorScheme];

    // Generate particles
    const positions: number[] = [];
    const sizes: number[] = [];
    const particleColors: number[] = [];
    const alphas: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a uniform sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.33) * 0.7; // Cubic root for uniform volume distribution
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions.push(x, y, z);

      // Random size with bias toward smaller particles
      const size = Math.pow(Math.random(), 2) * 4 + 1;
      sizes.push(size);

      // Pick color from palette with some variation
      const colorIndex = Math.floor(Math.random() * colors.length);
      const baseColor = colors[colorIndex];
      const variation = 0.1;
      particleColors.push(
        baseColor[0] + (Math.random() - 0.5) * variation,
        baseColor[1] + (Math.random() - 0.5) * variation,
        baseColor[2] + (Math.random() - 0.5) * variation
      );

      // Alpha with variation
      alphas.push(Math.random() * 0.5 + 0.3);
    }

    // Create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
    const sizeLoc = gl.getAttribLocation(program, "a_size");
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleColors), gl.STATIC_DRAW);
    const colorLoc = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    const alphaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(alphas), gl.STATIC_DRAW);
    const alphaLoc = gl.getAttribLocation(program, "a_alpha");
    gl.enableVertexAttribArray(alphaLoc);
    gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const pixelRatioLoc = gl.getUniformLocation(program, "u_pixelRatio");
    const aspectLoc = gl.getUniformLocation(program, "u_aspect");

    // Enable blending for soft particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for glow effect

    startTimeRef.current = performance.now();

    const render = () => {
      const time = (performance.now() - startTimeRef.current) / 1000;
      const aspect = canvas.width / canvas.height;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(timeLoc, time);
      gl.uniform1f(pixelRatioLoc, Math.min(window.devicePixelRatio, 2));
      gl.uniform1f(aspectLoc, aspect);

      gl.drawArrays(gl.POINTS, 0, particleCount);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, [particleCount, colorScheme]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ background: "transparent" }}
    />
  );
}
