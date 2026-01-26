"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const vertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Hover overlay shader - white dissolve effect around mouse
const hoverFragmentShader = `
  precision mediump float;
  uniform vec2 u_mouse;
  uniform float u_radius;
  uniform float u_time;
  uniform float u_hover;
  varying vec2 v_texCoord;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = v_texCoord;
    float dist = distance(uv, u_mouse);
    
    float effect = smoothstep(u_radius, 0.0, dist) * u_hover;
    
    if (effect < 0.01) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }
    
    float noise = random(uv + u_time * 0.1);
    float dissolve = smoothstep(effect - 0.2, effect + 0.2, noise);
    float whiteFade = smoothstep(u_radius, 0.0, dist);
    
    float alpha = effect * (1.0 - dissolve * 0.7) * whiteFade;
    
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

// Cache for dissolve masks per seed
const dissolveMaskCache = new Map<number, string>();

// Generate a dissolve mask that matches the shader effect
function generateDissolveMask(seed: number): string {
  const cached = dissolveMaskCache.get(seed);
  if (cached) return cached;
  
  const size = 1024; // Higher resolution for finer particles
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(size, size);
  
  // Seeded random function matching shader
  const random = (x: number, y: number) => {
    const dot = x * 12.9898 + y * 78.233 + seed;
    return (Math.sin(dot) * 43758.5453123) % 1;
  };
  
  const edgeWidth = 0.07; // Dissolve width from edge
  const cornerRadius = 0.1; // Rounded corner radius (larger = more rounded)
  
  // Signed distance function for rounded rectangle
  const sdRoundedBox = (px: number, py: number, bx: number, by: number, r: number) => {
    const qx = Math.abs(px) - bx + r;
    const qy = Math.abs(py) - by + r;
    return Math.min(Math.max(qx, qy), 0) + Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) - r;
  };
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // Normalize to 0-1
      const ux = x / size;
      const uy = y / size;
      
      // Center coordinates (-0.5 to 0.5)
      const cx = ux - 0.5;
      const cy = uy - 0.5;
      
      // Distance from rounded rectangle edge
      const dist = sdRoundedBox(cx, cy, 0.5, 0.5, cornerRadius);
      const distFromEdge = -dist;
      
      // Edge factor (0 at edge, 1 in center)
      const edgeFactor = Math.max(0, Math.min(1, distFromEdge / edgeWidth));
      
      // Generate noise (very high frequency for fine particles)
      const noise1 = Math.abs(random(ux * 500, uy * 500));
      const noise2 = Math.abs(random(ux * 800 + 50, uy * 800 + 50));
      const noise3 = Math.abs(random(ux * 1200 + 100, uy * 1200 + 100));
      const noise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
      
      // Dissolve: if noise < edgeFactor, pixel is visible
      const dissolved = noise < edgeFactor ? 255 : 0;
      
      // Hard cutoff outside rounded rect
      const inside = dist <= 0 ? 1 : 0;
      
      const alpha = dissolved * inside;
      
      imageData.data[i] = 255;
      imageData.data[i + 1] = 255;
      imageData.data[i + 2] = 255;
      imageData.data[i + 3] = alpha;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  const url = canvas.toDataURL();
  dissolveMaskCache.set(seed, url);
  return url;
}

interface PhotoCardProps {
  src: string;
  alt: string;
}

export default function PhotoCard({ src, alt }: PhotoCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [dissolveMask, setDissolveMask] = useState<string | null>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const hoverValue = useRef(0);
  const timeRef = useRef(0);
  const seedRef = useRef(Math.floor(Math.random() * 10000));

  // Generate dissolve mask on mount (unique per card)
  useEffect(() => {
    setDissolveMask(generateDissolveMask(seedRef.current));
  }, []);

  // Initialize WebGL when canvas mounts (after hover)
  useEffect(() => {
    if (!showCanvas) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Small delay to ensure canvas is in DOM
    const initTimeout = setTimeout(() => {
      const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true });
      if (!gl) {
        console.warn("WebGL not available");
        return;
      }

      // Create shaders
      const vShader = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vShader, vertexShader);
      gl.compileShader(vShader);

      const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fShader, hoverFragmentShader);
      gl.compileShader(fShader);

      // Create program
      const program = gl.createProgram()!;
      gl.attachShader(program, vShader);
      gl.attachShader(program, fShader);
      gl.linkProgram(program);
      gl.useProgram(program);

      // Set up geometry
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );

      const positionLocation = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
        gl.STATIC_DRAW
      );

      const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Start with effect already partially visible to avoid flicker
      hoverValue.current = 0.3;
      timeRef.current = 0;

      let running = true;

      const render = () => {
        if (!running) return;

        // Animate hover value toward 1
        hoverValue.current += (1 - hoverValue.current) * 0.08;
        timeRef.current += 0.016;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mousePos.current.x, mousePos.current.y);
        gl.uniform1f(gl.getUniformLocation(program, "u_radius"), 0.3);
        gl.uniform1f(gl.getUniformLocation(program, "u_time"), timeRef.current);
        gl.uniform1f(gl.getUniformLocation(program, "u_hover"), hoverValue.current);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animationRef.current = requestAnimationFrame(render);
      };

      render();

      return () => {
        running = false;
      };
    }, 16);

    return () => {
      clearTimeout(initTimeout);
      cancelAnimationFrame(animationRef.current);
    };
  }, [showCanvas]);

  // Handle hover state with debounce to prevent rapid toggling
  useEffect(() => {
    if (isHovered) {
      setShowCanvas(true);
    } else {
      // Small delay before hiding to allow fade out
      const timeout = setTimeout(() => {
        setShowCanvas(false);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isHovered]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePos.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  // CSS mask using the generated dissolve mask
  const maskStyle = dissolveMask ? {
    WebkitMaskImage: `url(${dissolveMask})`,
    WebkitMaskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskImage: `url(${dissolveMask})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
  } as React.CSSProperties : {};

  return (
    <div
      className="relative aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Base image with dissolve mask */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={maskStyle}
      />
      
      {/* Canvas overlay for hover effect */}
      {showCanvas && (
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
}
