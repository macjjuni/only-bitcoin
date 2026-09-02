/** 풀에 담기려면 활성 여부를 스스로 들고 있어야 한다. */
export interface PoolableObject {
  isActive: boolean;
}

/**
 * 고정 상한 객체 풀.
 *
 * 체결이 몰릴 때마다 객체를 새로 만들면 GC 가 프레임 중간에 끼어들어 화면이 끊긴다.
 * 한 번 만든 객체를 되쓰고, 상한에 닿으면 새로 만드는 대신 생성을 포기한다.
 * 효과 하나를 건너뛰는 편이 프레임을 떨어뜨리는 것보다 낫다.
 */
export class ObjectPool<T extends PoolableObject> {
  private readonly items: T[] = [];
  private readonly freeItems: T[] = [];
  private readonly createItem: () => T;
  private capacity: number;
  private activeCount = 0;

  constructor(createItem: () => T, capacity: number) {
    this.createItem = createItem;
    this.capacity = Math.max(0, capacity);
  }

  get activeObjectCount(): number {
    return this.activeCount;
  }

  /** 밀도 설정이나 화면 크기가 바뀌면 상한만 갈아 끼운다. 이미 살아 있는 객체는 수명대로 사라진다. */
  setCapacity(capacity: number): void {
    this.capacity = Math.max(0, capacity);
  }

  /** 쓸 수 있는 객체를 하나 내준다. 상한에 닿았으면 `null`. */
  acquire(): T | null {
    if (this.activeCount >= this.capacity) {
      return null;
    }

    const recycledItem = this.freeItems.pop();

    if (recycledItem !== undefined) {
      recycledItem.isActive = true;
      this.activeCount += 1;
      return recycledItem;
    }

    const createdItem = this.createItem();
    createdItem.isActive = true;
    this.items.push(createdItem);
    this.activeCount += 1;

    return createdItem;
  }

  release(item: T): void {
    if (!item.isActive) {
      return;
    }

    item.isActive = false;
    this.activeCount -= 1;
    this.freeItems.push(item);
  }

  forEachActive(callback: (item: T) => void): void {
    for (const item of this.items) {
      if (item.isActive) {
        callback(item);
      }
    }
  }

  clear(): void {
    for (const item of this.items) {
      if (item.isActive) {
        item.isActive = false;
        this.freeItems.push(item);
      }
    }

    this.activeCount = 0;
  }
}
