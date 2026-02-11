"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

interface GrainientProps {
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  className?: string;
}

type Rgb = [number, number, number];
type QualityTier = "low" | "medium" | "high";

type QualityProfile = {
  tier: QualityTier;
  fps: number;
  dprCap: number;
  renderScale: number;
  warpFrequencyScale: number;
  warpSpeedScale: number;
  rotationScale: number;
  noiseScaleMultiplier: number;
  grainScaleMultiplier: number;
};

type NavigatorWithConnection = Navigator & {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
};

const hexToRgb = (hex: string): Rgb | null => {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[a-f\d]{3}$|^[a-f\d]{6}$/i.test(normalized)) {
    return null;
  }

  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;

  const red = parseInt(fullHex.slice(0, 2), 16) / 255;
  const green = parseInt(fullHex.slice(2, 4), 16) / 255;
  const blue = parseInt(fullHex.slice(4, 6), 16) / 255;

  return [red, green, blue];
};

const rgbStringToRgb = (value: string): Rgb | null => {
  const match = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }

  const channels = match[1]
    .split(",")
    .slice(0, 3)
    .map((channel) => Number.parseFloat(channel.trim()));

  if (
    channels.length !== 3 ||
    channels.some((channel) => Number.isNaN(channel))
  ) {
    return null;
  }

  return channels.map((channel) => {
    const normalized = channel > 1 ? channel / 255 : channel;
    return Math.min(1, Math.max(0, normalized));
  }) as Rgb;
};

const resolveCssVariable = (
  value: string,
  scope: HTMLElement | null,
): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("var(") || !scope) {
    return trimmed;
  }

  const variableMatch = trimmed.match(/var\((--[^,\s)]+)/);
  if (!variableMatch) {
    return trimmed;
  }

  const resolved = getComputedStyle(scope)
    .getPropertyValue(variableMatch[1])
    .trim();
  return resolved || trimmed;
};

const resolveColor = (value: string, scope: HTMLElement | null): Rgb => {
  const resolved = resolveCssVariable(value, scope);
  return hexToRgb(resolved) ?? rgbStringToRgb(resolved) ?? [1, 1, 1];
};

const getQualityProfile = (): QualityProfile => {
  const navigatorWithConnection = navigator as NavigatorWithConnection;
  const saveData = navigatorWithConnection.connection?.saveData === true;
  const deviceMemory = navigatorWithConnection.deviceMemory ?? 4;
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (
    prefersReducedMotion ||
    saveData ||
    deviceMemory <= 2 ||
    hardwareConcurrency <= 4
  ) {
    return {
      tier: "low",
      fps: 24,
      dprCap: 1,
      renderScale: 0.68,
      warpFrequencyScale: 0.78,
      warpSpeedScale: 0.82,
      rotationScale: 0.6,
      noiseScaleMultiplier: 0.72,
      grainScaleMultiplier: 0.6,
    };
  }

  if (deviceMemory <= 4 || hardwareConcurrency <= 6) {
    return {
      tier: "medium",
      fps: 30,
      dprCap: 1.25,
      renderScale: 0.82,
      warpFrequencyScale: 0.88,
      warpSpeedScale: 0.9,
      rotationScale: 0.8,
      noiseScaleMultiplier: 0.84,
      grainScaleMultiplier: 0.8,
    };
  }

  return {
    tier: "high",
    fps: 60,
    dprCap: 1.5,
    renderScale: 1,
    warpFrequencyScale: 1,
    warpSpeedScale: 1,
    rotationScale: 1,
    noiseScaleMultiplier: 1,
    grainScaleMultiplier: 1,
  };
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);} 
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);} 
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);} 
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

export default function Grainient({
  timeSpeed = 0.25,
  colorBalance = 0.0,
  warpStrength = 1.0,
  warpFrequency = 5.0,
  warpSpeed = 2.0,
  warpAmplitude = 50.0,
  blendAngle = 0.0,
  blendSoftness = 0.05,
  rotationAmount = 500.0,
  noiseScale = 2.0,
  grainAmount = 0.1,
  grainScale = 2.0,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1.0,
  saturation = 1.0,
  centerX = 0.0,
  centerY = 0.0,
  zoom = 0.9,
  color1 = "#FF9FFC",
  color2 = "#5227FF",
  color3 = "#B19EEF",
  className = "",
}: GrainientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const quality = getQualityProfile();

    const createRenderer = () => {
      const options = {
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, quality.dprCap),
      };

      try {
        return new Renderer({ webgl: 2, ...options });
      } catch {
        return new Renderer({ webgl: 1, ...options });
      }
    };

    let renderer: Renderer;
    try {
      renderer = createRenderer();
    } catch {
      return;
    }

    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uTimeSpeed: { value: timeSpeed },
        uColorBalance: { value: colorBalance },
        uWarpStrength: { value: warpStrength },
        uWarpFrequency: { value: warpFrequency * quality.warpFrequencyScale },
        uWarpSpeed: { value: warpSpeed * quality.warpSpeedScale },
        uWarpAmplitude: { value: warpAmplitude },
        uBlendAngle: { value: blendAngle },
        uBlendSoftness: { value: blendSoftness },
        uRotationAmount: { value: rotationAmount * quality.rotationScale },
        uNoiseScale: { value: noiseScale * quality.noiseScaleMultiplier },
        uGrainAmount: { value: grainAmount * quality.grainScaleMultiplier },
        uGrainScale: { value: grainScale },
        uGrainAnimated: {
          value: grainAnimated && quality.tier === "high" ? 1.0 : 0.0,
        },
        uContrast: { value: contrast },
        uGamma: { value: gamma },
        uSaturation: { value: saturation },
        uCenterOffset: { value: new Float32Array([centerX, centerY]) },
        uZoom: { value: zoom },
        uColor1: { value: new Float32Array([1, 1, 1]) },
        uColor2: { value: new Float32Array([1, 1, 1]) },
        uColor3: { value: new Float32Array([1, 1, 1]) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * quality.renderScale));
      const height = Math.max(1, Math.floor(rect.height * quality.renderScale));
      renderer.setSize(width, height);
      canvas.style.width = `${Math.floor(rect.width)}px`;
      canvas.style.height = `${Math.floor(rect.height)}px`;

      const resolution = (
        program.uniforms.iResolution as { value: Float32Array }
      ).value;
      resolution[0] = gl.drawingBufferWidth;
      resolution[1] = gl.drawingBufferHeight;
    };

    const applyColors = () => {
      (program.uniforms.uColor1 as { value: Float32Array }).value.set(
        resolveColor(color1, container),
      );
      (program.uniforms.uColor2 as { value: Float32Array }).value.set(
        resolveColor(color2, container),
      );
      (program.uniforms.uColor3 as { value: Float32Array }).value.set(
        resolveColor(color3, container),
      );
    };

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(applyColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => applyColors();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSchemeChange);
    } else {
      mediaQuery.addListener(handleSchemeChange);
    }

    let animationFrame = 0;
    const startTime = performance.now();
    const frameInterval = 1000 / quality.fps;
    let previousFrameTime = 0;

    const loop = (time: number) => {
      if (previousFrameTime !== 0 && time - previousFrameTime < frameInterval) {
        animationFrame = requestAnimationFrame(loop);
        return;
      }

      previousFrameTime = time;
      (program.uniforms.iTime as { value: number }).value =
        (time - startTime) * 0.001;
      renderer.render({ scene: mesh });
      animationFrame = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
        return;
      }

      if (!animationFrame) {
        animationFrame = requestAnimationFrame(loop);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    setSize();
    applyColors();
    animationFrame = requestAnimationFrame(loop);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      document.removeEventListener("visibilitychange", handleVisibility);
      resizeObserver.disconnect();
      themeObserver.disconnect();

      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleSchemeChange);
      } else {
        mediaQuery.removeListener(handleSchemeChange);
      }

      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [
    timeSpeed,
    colorBalance,
    warpStrength,
    warpFrequency,
    warpSpeed,
    warpAmplitude,
    blendAngle,
    blendSoftness,
    rotationAmount,
    noiseScale,
    grainAmount,
    grainScale,
    grainAnimated,
    contrast,
    gamma,
    saturation,
    centerX,
    centerY,
    zoom,
    color1,
    color2,
    color3,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
