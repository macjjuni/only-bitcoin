/**
 * 고정 크기 링 버퍼.
 *
 * 고빈도 체결을 React state 로 올리지 않고 여기에 쌓는다. 용량을 넘기면 가장 오래된 항목을
 * 덮어써서 메모리 상한이 보장된다. 백그라운드 탭에서 소비가 멈춰도 무한히 자라지 않는다.
 */
export class RingBuffer<T> {
  private readonly items: Array<T | undefined>;
  private readonly capacity: number;
  private headIndex = 0;
  private itemCount = 0;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.items = new Array<T | undefined>(this.capacity);
  }

  get size(): number {
    return this.itemCount;
  }

  /** 가득 찬 경우 가장 오래된 항목을 버리고 넣는다. */
  push(item: T): void {
    const writeIndex = (this.headIndex + this.itemCount) % this.capacity;
    this.items[writeIndex] = item;

    if (this.itemCount === this.capacity) {
      this.headIndex = (this.headIndex + 1) % this.capacity;
      return;
    }

    this.itemCount += 1;
  }

  /** 오래된 순으로 최대 `limit` 개를 꺼내고 버퍼에서 제거한다. */
  drain(limit: number): T[] {
    const drainCount = Math.min(limit, this.itemCount);
    const drainedItems: T[] = [];

    for (let index = 0; index < drainCount; index += 1) {
      const readIndex = (this.headIndex + index) % this.capacity;
      const item = this.items[readIndex];

      if (item !== undefined) {
        drainedItems.push(item);
      }

      this.items[readIndex] = undefined;
    }

    this.headIndex = (this.headIndex + drainCount) % this.capacity;
    this.itemCount -= drainCount;

    return drainedItems;
  }

  /** 오래된 순으로 순회한다. 버퍼는 그대로 둔다. */
  forEach(callback: (item: T) => void): void {
    for (let index = 0; index < this.itemCount; index += 1) {
      const item = this.items[(this.headIndex + index) % this.capacity];

      if (item !== undefined) {
        callback(item);
      }
    }
  }

  clear(): void {
    this.items.fill(undefined);
    this.headIndex = 0;
    this.itemCount = 0;
  }
}
