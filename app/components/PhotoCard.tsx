"use client";

import { useRef, useEffect, useCallback } from "react";

// Shared WebGL context - only one for the entire page
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedGl: WebGLRenderingContext | null = null;
let sharedProgram: WebGLProgram | null = null;
let activeCard: HTMLDivElement | null = null;
let animationId: number = 0;
let currentImage: HTMLImageElement | null = null;
let mousePos = { x: 0.5, y: 0.5 };
let hoverValue = 0;
let timeValue = 0;

const vertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform vec2 u_mouse;
  uniform float u_radius;
  uniform float u_hover;
  uniform float u_time;
  uniform float u_seed;
  uniform float u_edgeWidth;
  uniform float u_cornerRadius;
  uniform vec2 u_imageAspect;
  varying vec2 v_texCoord;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 uv = v_texCoord;
    
    // Simulate object-cover
    vec2 imageUV = uv;
    float imageRatio = u_imageAspect.x;
    if (imageRatio > 1.0) {
      float scale = 1.0 / imageRatio;
      imageUV.x = uv.x * scale + (1.0 - scale) * 0.5;
    } else if (imageRatio < 1.0) {
      float scale = imageRatio;
      imageUV.y = uv.y * scale + (1.0 - scale) * 0.5;
    }
    
    vec4 imageColor = texture2D(u_image, imageUV);
    vec3 white = vec3(1.0, 1.0, 1.0);
    
    // Edge dissolve
    vec2 centered = uv - 0.5;
    float dist = sdRoundedBox(centered, vec2(0.5, 0.5), u_cornerRadius);
    float distFromEdge = -dist;
    float edgeFactor = smoothstep(0.0, u_edgeWidth, distFromEdge);
    
    float noise1 = abs(random(uv * 500.0 + u_seed));
    float noise2 = abs(random(uv * 800.0 + u_seed + 50.0));
    float noise3 = abs(random(uv * 1200.0 + u_seed + 100.0));
    float edgeNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    
    float showImage = step(edgeNoise, edgeFactor);
    float insideShape = step(dist, 0.0);
    
    // Hover dissolve with floating particles
    float mouseDist = distance(uv, u_mouse);
    float hoverEffect = smoothstep(u_radius, 0.0, mouseDist) * u_hover;
    
    float floatSpeed = u_time * 0.3;
    vec2 floatOffset1 = vec2(sin(floatSpeed + uv.y * 3.0) * 0.02, -floatSpeed * 0.15);
    vec2 floatOffset2 = vec2(cos(floatSpeed * 0.7 + uv.x * 4.0) * 0.015, -floatSpeed * 0.12);
    vec2 floatOffset3 = vec2(sin(floatSpeed * 1.3 + uv.y * 2.0 + uv.x * 2.0) * 0.025, -floatSpeed * 0.1);
    
    float hoverNoise1 = abs(random((uv + floatOffset1) * 400.0));
    float hoverNoise2 = abs(random((uv + floatOffset2) * 700.0));
    float hoverNoise3 = abs(random((uv + floatOffset3) * 1100.0));
    float hoverNoise = hoverNoise1 * 0.4 + hoverNoise2 * 0.35 + hoverNoise3 * 0.25;
    
    float showWhiteFromHover = step(hoverNoise, hoverEffect);
    
    vec3 finalColor = imageColor.rgb;
    finalColor = mix(white, finalColor, showImage);
    finalColor = mix(finalColor, white, showWhiteFromHover);
    finalColor = mix(white, finalColor, insideShape);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function initSharedCanvas() {
  if (sharedCanvas) return;
  
  sharedCanvas = document.createElement("canvas");
  sharedCanvas.width = 512;
  sharedCanvas.height = 512;
  sharedCanvas.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.15s ease-out;
  `;
  document.body.appendChild(sharedCanvas);
  
  const gl = sharedCanvas.getContext("webgl", { premultipliedAlpha: false, alpha: true });
  if (!gl) return;
  sharedGl = gl;
  
  // Create shaders
  const vShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vShader, vertexShader);
  gl.compileShader(vShader);
  
  const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fShader, fragmentShader);
  gl.compileShader(fShader);
  
  const program = gl.createProgram()!;
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  gl.useProgram(program);
  sharedProgram = program;
  
  // Geometry
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), gl.STATIC_DRAW);
  const texLoc = gl.getAttribLocation(program, "a_texCoord");
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
  
  // Texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function render() {
  if (!sharedGl || !sharedProgram || !sharedCanvas || !activeCard) return;
  
  const gl = sharedGl;
  const program = sharedProgram;
  
  // Position canvas over active card
  const rect = activeCard.getBoundingClientRect();
  sharedCanvas.style.left = `${rect.left}px`;
  sharedCanvas.style.top = `${rect.top}px`;
  sharedCanvas.style.width = `${rect.width}px`;
  sharedCanvas.style.height = `${rect.height}px`;
  
  // Animate hover
  hoverValue += (1 - hoverValue) * 0.12;
  timeValue += 0.016;
  
  gl.viewport(0, 0, sharedCanvas.width, sharedCanvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  const imageAspect = currentImage ? currentImage.width / currentImage.height : 1;
  
  gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mousePos.x, mousePos.y);
  gl.uniform1f(gl.getUniformLocation(program, "u_radius"), 0.15);
  gl.uniform1f(gl.getUniformLocation(program, "u_hover"), hoverValue);
  gl.uniform1f(gl.getUniformLocation(program, "u_time"), timeValue);
  gl.uniform1f(gl.getUniformLocation(program, "u_seed"), Math.random() * 0.001 + (activeCard?.dataset.seed ? parseFloat(activeCard.dataset.seed) : 0));
  gl.uniform1f(gl.getUniformLocation(program, "u_edgeWidth"), 0.07);
  gl.uniform1f(gl.getUniformLocation(program, "u_cornerRadius"), 0.08);
  gl.uniform2f(gl.getUniformLocation(program, "u_imageAspect"), imageAspect, 1.0);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  animationId = requestAnimationFrame(render);
}

function activateCard(card: HTMLDivElement, img: HTMLImageElement) {
  initSharedCanvas();
  if (!sharedGl || !sharedCanvas) return;
  
  activeCard = card;
  currentImage = img;
  hoverValue = 0;
  
  // Load image into texture
  sharedGl.texImage2D(sharedGl.TEXTURE_2D, 0, sharedGl.RGBA, sharedGl.RGBA, sharedGl.UNSIGNED_BYTE, img);
  
  sharedCanvas.style.opacity = "1";
  
  if (!animationId) {
    render();
  }
}

function deactivateCard() {
  if (sharedCanvas) {
    sharedCanvas.style.opacity = "0";
  }
  activeCard = null;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
}

function updateMouse(x: number, y: number) {
  mousePos = { x, y };
}

interface PhotoCardProps {
  src: string;
  alt: string;
}

export default function PhotoCard({ src, alt }: PhotoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const seedRef = useRef(Math.random() * 1000);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.dataset.seed = seedRef.current.toString();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    updateMouse(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height
    );
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (containerRef.current && imgRef.current && imgRef.current.complete) {
      activateCard(containerRef.current, imgRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    deactivateCard();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square overflow-hidden rounded-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
