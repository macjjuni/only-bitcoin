"use client";

import { useCallback, useEffect, useRef } from "react";
import useConfettiStore from "@/shared/stores/confettiStore";

type ShapeType = "square" | "circle" | "strip";

interface Particle {
  x: number;
  y: number;
  color: string;
  size: number;
  shape: ShapeType;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltAngleIncrement: number;
}

const COLORS = [
  "#ff4757",
  "#2ed573",
  "#1e90ff",
  "#ffa502",
  "#9b59b6",
  "#f1c40f",
  "#e056fd",
  "#686de0",
];
const SHAPES: ShapeType[] = ["square", "circle", "strip", "square"];
const COUNT_PER_SIDE = 120;

const ConfettiEffect = () => {
  // region [Hooks]
  const isActive = useConfettiStore((state) => state.isActive);
  const hide = useConfettiStore((state) => state.hide);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationId = useRef<number>(0);
  // endregion

  // region [Privates]
  /**
   * 좌/우 모서리에서 위로 분사되는 입자를 생성한다.
   */
  const createParticles = useCallback((width: number, height: number) => {
    for (let i = 0; i < COUNT_PER_SIDE * 2; i++) {
      const isLeft = i < COUNT_PER_SIDE;
      const baseSize = Math.random() * 8 + 5;

      particles.current.push({
        x: isLeft ? -10 : width + 10,
        y: height,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: baseSize,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        velocity: {
          x: isLeft ? Math.random() * 12 + 8 : (Math.random() * 12 + 8) * -1,
          y: (Math.random() * 18 + 12) * -1,
        },
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
        tiltAngle: Math.random() * Math.PI,
        tiltAngleIncrement: Math.random() * 0.08 + 0.04,
      });
    }
  }, []);

  const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);

    const flipScale = Math.cos(p.tiltAngle);
    ctx.fillStyle = p.color;

    ctx.beginPath();
    switch (p.shape) {
      case "circle":
        ctx.ellipse(0, 0, p.size / 2, Math.abs((p.size / 2) * flipScale), 0, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case "strip":
        ctx.fillRect(-p.size / 4, -p.size * 0.75 * flipScale, p.size / 2, p.size * 1.5 * flipScale);
        break;
      default:
        ctx.fillRect(-p.size / 2, (-p.size / 2) * flipScale, p.size, p.size * flipScale);
        break;
    }
    ctx.closePath();
    ctx.restore();
  };

  const updateAndDraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      // 역순 순회: splice 시 인덱스 밀림 현상 방지 및 안정적인 제거
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];

        p.tiltAngle += p.tiltAngleIncrement;
        p.velocity.y += 0.3;
        p.velocity.x *= 0.99;
        p.x += p.velocity.x + Math.sin(p.tiltAngle) * 0.5;
        p.y += p.velocity.y;
        p.rotation += p.rotationSpeed;

        drawParticle(ctx, p);

        if (p.y > height + 50) {
          particles.current.splice(i, 1);
        }
      }

      if (particles.current.length > 0) {
        animationId.current = requestAnimationFrame(() => updateAndDraw(ctx, width, height));
      } else {
        hide(); // 모든 입자가 제거되면 Store 상태 변경
      }
    },
    [hide],
  );
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    createParticles(canvas.width, canvas.height);
    updateAndDraw(ctx, canvas.width, canvas.height);

    return () => {
      cancelAnimationFrame(animationId.current);
      window.removeEventListener("resize", handleResize);
      particles.current = [];
    };
  }, [isActive, createParticles, updateAndDraw]);
  // endregion

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
};

export default ConfettiEffect;
