/**
 * 크기 상한이 있는 중복 확인용 집합.
 *
 * 거래소가 같은 체결을 두 번 보내거나 재연결 직후 과거 체결이 다시 흘러올 때를 막는다.
 * 무한히 커지는 `Set` 은 장시간 실행에서 누수라, 세대(generation) 두 벌을 번갈아 쓴다.
 * 현재 세대가 한도를 넘으면 이전 세대를 통째로 버리므로 삭제 비용이 O(1) 이고
 * 최근 `limit` 개 이상은 항상 기억한다.
 */
export class BoundedIdSet {
  private currentGeneration = new Set<string>();
  private previousGeneration = new Set<string>();
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = Math.max(1, limit);
  }

  /** 처음 보는 ID 면 기록하고 `true`, 이미 본 ID 면 `false`. */
  addIfAbsent(identifier: string): boolean {
    if (this.currentGeneration.has(identifier) || this.previousGeneration.has(identifier)) {
      return false;
    }

    this.currentGeneration.add(identifier);

    if (this.currentGeneration.size >= this.limit) {
      this.previousGeneration = this.currentGeneration;
      this.currentGeneration = new Set<string>();
    }

    return true;
  }

  clear(): void {
    this.currentGeneration.clear();
    this.previousGeneration.clear();
  }
}
