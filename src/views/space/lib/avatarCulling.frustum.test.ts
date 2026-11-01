import {
  BoxGeometry,
  Frustum,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Vector3,
} from "three";
import { describe, expect, it } from "vitest";
import { SPACE_MAX_OCCUPANTS } from "@/entities/space";

/**
 * 아바타 `InstancedMesh` 의 프러스텀 컬링을 끈 이유를 고정한다.
 *
 * three 는 `InstancedMesh` 의 바운딩 스피어를 `boundingSphere === null` 일 때만
 * 계산하고, 인스턴스가 움직여도 다시 계산하지 않는다. 그래서 한 번 굳은 구가
 * 실제 아바타 위치를 못 따라간다. 명찰은 DOM(`<Html>`)이라 그대로 보이므로
 * "사람은 투명한데 닉네임만 뜨는" 상태가 된다.
 *
 * 이 테스트가 깨지면 three 가 동작을 고친 것이다. 그때는 `frustumCulled={false}`
 * 를 되돌려 컬링을 다시 켤 수 있다.
 */
// region [Privates]
const createAvatarMesh = (): InstancedMesh => {
  // 실제 모델 대신 비슷한 크기의 상자를 쓴다. 검증 대상은 컬링 규칙이다.
  return new InstancedMesh(
    new BoxGeometry(0.7, 1.81, 0.7),
    new MeshBasicMaterial(),
    SPACE_MAX_OCCUPANTS,
  );
};

const placeAt = (mesh: InstancedMesh, positions: readonly [number, number][]): void => {
  const proxy = new Object3D();

  positions.forEach(([x, z], index) => {
    proxy.position.set(x, 0, z);
    proxy.updateMatrix();
    mesh.setMatrixAt(index, proxy.matrix);
  });
  mesh.count = positions.length;
};

/**
 * 아바타를 똑바로 보는 카메라의 프러스텀.
 *
 * 굳은 빈 구는 중심이 원점이라, 컬링 통과 여부가 "원점이 화면에 들어오는지"로
 * 갈린다. 증상이 **가끔** 나타나는 이유가 이것이다. 테스트는 원점이 확실히
 * 화면 밖인 각도를 고정해 쓴다.
 */
const frustumLookingAt = (target: [number, number], from: [number, number]): Frustum => {
  const camera = new PerspectiveCamera(55, 16 / 9, 0.1, 220);
  camera.position.set(from[0], 4, from[1]);
  camera.lookAt(target[0], 1, target[1]);
  camera.updateMatrixWorld();

  return new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
};
// endregion

describe("아바타 인스턴스 프러스텀 컬링", () => {
  it("접속자가 없을 때 굳은 바운딩 스피어는 비어 있다", () => {
    const mesh = createAvatarMesh();
    mesh.count = 0;
    mesh.computeBoundingSphere();

    // 빈 구는 반지름이 -1 이다. 이 상태로 굳으면 무엇도 통과하지 못한다.
    expect(mesh.boundingSphere?.radius).toBe(-1);
  });

  it("인스턴스가 들어와도 three 는 구를 다시 계산하지 않는다", () => {
    const mesh = createAvatarMesh();
    mesh.count = 0;
    mesh.computeBoundingSphere();
    placeAt(mesh, [
      [12, 6],
      [-9, 6],
    ]);

    expect(mesh.boundingSphere?.radius).toBe(-1);
  });

  it("컬링을 켜 두면 아바타를 똑바로 봐도 사라진다", () => {
    const mesh = createAvatarMesh();
    mesh.count = 0;
    mesh.computeBoundingSphere();
    placeAt(mesh, [[12, 6]]);
    const frustum = frustumLookingAt([12, 6], [0, 14]);

    expect(mesh.intersectsFrustum(frustum)).toBe(false);
    // 구를 다시 계산하면 통과한다. 지오메트리가 아니라 굳은 구가 문제다.
    mesh.boundingSphere = null;
    expect(mesh.intersectsFrustum(frustum)).toBe(true);
  });

  it("걸어 다니면 처음 계산한 구를 벗어난다", () => {
    const mesh = createAvatarMesh();
    placeAt(mesh, [[0, 0]]);
    mesh.computeBoundingSphere();
    const settled = mesh.boundingSphere;

    // 스폰 링 반대편까지 걸어가도 구는 처음 자리에 남는다.
    placeAt(mesh, [[20, 14]]);

    expect(settled?.center.x).toBeCloseTo(0, 5);
    expect(settled?.containsPoint(new Vector3(20, 0, 14))).toBe(false);
    expect(mesh.boundingSphere).toBe(settled);
  });
});
