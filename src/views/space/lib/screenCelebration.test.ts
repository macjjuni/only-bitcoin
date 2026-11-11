import { describe, expect, it } from "vitest";
import {
  createConfettiParticles,
  readCelebrationBurstElapsed,
  readConfettiPose,
  SCREEN_CELEBRATION,
} from "./screenCelebration";

describe("전광판 폭죽", () => {
  it("같은 서버 seed는 같은 궤적을 만들고 새 이벤트는 패턴을 바꾼다", () => {
    expect(createConfettiParticles(12345)).toEqual(createConfettiParticles(12345));
    expect(createConfettiParticles(12345)).not.toEqual(createConfettiParticles(54321));
  });
  it("0초, 10초, 20초에만 발사하고 각 발사 사이에는 쉰다", () => {
    for (const start of [0, 10, 20]) {
      expect(readCelebrationBurstElapsed(start)).toBe(0);
      expect(readCelebrationBurstElapsed(start + 1)).toBe(1);
      expect(readCelebrationBurstElapsed(start + 3.3)).toBeNull();
      expect(readCelebrationBurstElapsed(start + 9)).toBeNull();
    }
    expect(readCelebrationBurstElapsed(30)).toBeNull();
    expect(readCelebrationBurstElapsed(60)).toBeNull();
    expect(readCelebrationBurstElapsed(-1)).toBeNull();
    expect(readCelebrationBurstElapsed(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("늦게 확인해도 현재 회차의 경과 시각을 사용한다", () => {
    expect(readCelebrationBurstElapsed(21.5)).toBe(1.5);
    expect(readCelebrationBurstElapsed(25)).toBeNull();
  });

  it("전광판 전체에서 색종이와 작은 반짝임을 함께 만든다", () => {
    const particles = createConfettiParticles();
    expect(particles.some((particle) => particle.isSparkle)).toBe(true);
    expect(particles.some((particle) => !particle.isSparkle)).toBe(true);
    expect(
      particles.map((particle) => readConfettiPose(particle, 0.8)).some((pose) => pose.size > 0),
    ).toBe(true);
  });

  it("양쪽 아래에서 출발해 안쪽으로 솟구친 뒤 천천히 내려온다", () => {
    const particles = createConfettiParticles();
    expect(particles.filter((particle) => particle.originX < 0)).toHaveLength(particles.length / 2);
    for (const particle of particles) {
      const start = readConfettiPose(particle, particle.delay);
      const rising = readConfettiPose(particle, particle.delay + 0.3);
      const peak = readConfettiPose(particle, particle.delay + 1.2);
      const falling = readConfettiPose(particle, particle.delay + 2.6);
      expect(Math.abs(start.x)).toBeGreaterThan(0.42);
      expect(start.y).toBeLessThan(-0.42);
      expect(Math.abs(rising.x)).toBeLessThan(Math.abs(start.x));
      expect(rising.y).toBeGreaterThan(start.y);
      expect(falling.y).toBeLessThan(peak.y);
    }
  });

  it("퍼진 입자가 중앙에만 몰리지 않고 화면 양 끝까지 남아 있다", () => {
    const poses = createConfettiParticles()
      .map((particle) => readConfettiPose(particle, 1.2))
      .filter((pose) => pose.size > 0);
    expect(poses.length).toBeGreaterThan(150);
    expect(poses.some((pose) => pose.x < -0.35)).toBe(true);
    expect(poses.some((pose) => pose.x > 0.35)).toBe(true);
    expect(poses.some((pose) => Math.abs(pose.x) < 0.1)).toBe(true);
    expect(
      Math.max(...poses.map((pose) => pose.y)) - Math.min(...poses.map((pose) => pose.y)),
    ).toBeGreaterThan(0.35);
  });

  it("시작 전과 종료 후에는 입자를 표시하지 않는다", () => {
    for (const particle of createConfettiParticles()) {
      expect(readConfettiPose(particle, -1).size).toBe(0);
      expect(readConfettiPose(particle, SCREEN_CELEBRATION.durationSeconds).size).toBe(0);
      expect(readConfettiPose(particle, 60).size).toBe(0);
    }
  });

  it("표시되는 입자가 전광판 바깥으로 나가지 않고 유한한 크기를 갖는다", () => {
    for (const particle of createConfettiParticles()) {
      for (let elapsed = 0; elapsed <= 3.5; elapsed += 0.1) {
        const pose = readConfettiPose(particle, elapsed);
        expect(Number.isFinite(pose.size)).toBe(true);
        if (pose.size > 0) {
          expect(Math.abs(pose.x) + pose.size).toBeLessThan(0.5);
          expect(Math.abs(pose.y) + pose.size * 1.5).toBeLessThan(0.5);
        }
      }
    }
  });
});
