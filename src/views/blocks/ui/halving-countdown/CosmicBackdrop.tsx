"use client";

import { memo, useEffect, useRef } from "react";

const STAR_COUNT = 90;
const PARTICLE_COUNT = 46;

/** 입자 색상 색조 범위. oklch(0.78 0.16 H) 의 H = 265 ± 30 (보라~파랑) */
const PARTICLE_HUE_BASE = 265;
const PARTICLE_HUE_RANGE = 30;

interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  phaseSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vy: number;
  alpha: number;
  color: string;
}

/**
 * oklch 를 sRGB 로 변환한다.
 *
 * 캔버스 `fillStyle` 의 oklch 파싱은 구형 iOS Safari 에서 무시되어 색이 검게 칠해지므로,
 * 색상 계산은 JS 에서 마치고 rgb 문자열만 넘긴다.
 */
const oklchToRgb = (lightness: number, chroma: number, hue: number) => {
  const radian = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radian);
  const b = chroma * Math.sin(radian);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linearRgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const [r, g, blue] = linearRgb.map((channel) => {
    const encoded = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(Math.max(encoded, 0), 1) * 255);
  });

  return `${r}, ${g}, ${blue}`;
};

interface CosmicBackdropProps {
  className?: string;
}

/**
 * 딥 스페이스 배경 레이어.
 *
 * 베이스 색 → 보라·시안 글로우 블롭 → 별/상승 입자 캔버스 순으로 쌓는다.
 * 레이아웃 프레임(max-w-layout) 안에 고정되어 콘텐츠가 스크롤해도 함께 움직이지 않는다.
 */
const CosmicBackdrop = ({ className = "" }: CosmicBackdropProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let particles: Particle[] = [];

    const createParticle = (initialY?: number): Particle => ({
      x: Math.random() * width,
      y: initialY ?? height + Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      vy: -(Math.random() * 0.35 + 0.12),
      alpha: Math.random() * 0.5 + 0.2,
      color: oklchToRgb(
        0.78,
        0.16,
        PARTICLE_HUE_BASE + (Math.random() * 2 - 1) * PARTICLE_HUE_RANGE,
      ),
    });

    /** 캔버스를 컨테이너 크기에 맞추고 별·입자를 다시 배치한다. */
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.3 + 0.2,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.03 + 0.008,
      }));

      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(Math.random() * height),
      );
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.shadowBlur = 0;
      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.phase += star.phaseSpeed;
        }

        const opacity = 0.35 + Math.sin(star.phase) * 0.35;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 235, 255, ${opacity})`;
        ctx.fill();
      }

      for (const particle of particles) {
        if (!prefersReducedMotion) {
          particle.y += particle.vy;
          particle.x += Math.sin(particle.y * 0.01) * 0.15;

          if (particle.y < -particle.radius) {
            Object.assign(particle, createParticle(height + particle.radius));
          }
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${particle.color}, ${particle.alpha})`;
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    };

    const loop = () => {
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };

    resize();

    if (prefersReducedMotion) {
      draw();
    } else {
      frameRef.current = requestAnimationFrame(loop);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (prefersReducedMotion) draw();
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
    };
  }, []);
  // endregion

  return (
    <div
      className={[
        "pointer-events-none fixed inset-y-0 left-0 z-0 w-full overflow-hidden bg-[#05060f]",
        // 데스크톱에서는 뷰포트 전체가 아니라 앱 프레임 안에만 깔림.
        "layout-max:left-1/2 layout-max:w-full layout-max:max-w-layout layout-max:-translate-x-1/2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span
        className="absolute -top-[10%] -left-[20%] h-[min(80vw,520px)] w-[min(80vw,520px)] rounded-full blur-[60px] animate-blob-drift-a"
        style={{
          // oklch(0.55 0.2 290 / 0.55)
          background: "radial-gradient(circle, rgba(117, 82, 219, 0.55), transparent 70%)",
        }}
      />
      <span
        className="absolute -right-[22%] -bottom-[8%] h-[min(78vw,500px)] w-[min(78vw,500px)] rounded-full blur-[64px] animate-blob-drift-b"
        style={{
          // oklch(0.62 0.16 210 / 0.5)
          background: "radial-gradient(circle, rgba(0, 157, 187, 0.5), transparent 70%)",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};

const MemoizedCosmicBackdrop = memo(CosmicBackdrop);
MemoizedCosmicBackdrop.displayName = "CosmicBackdrop";

export default MemoizedCosmicBackdrop;
