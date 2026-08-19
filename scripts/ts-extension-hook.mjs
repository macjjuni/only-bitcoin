/**
 * 확장자를 생략한 상대 경로 import 를 `.ts` 로 이어 주는 Node 리졸버 훅.
 *
 * 앱 코드는 번들러 기준으로 `from "./aggregateTrades"` 처럼 확장자를 생략하지만,
 * Node ESM 은 확장자를 요구한다. 스크립트가 앱의 집계 모듈을 **그대로 재사용**하려면
 * 이 간극을 메워야 한다. ( tsx 같은 의존성을 추가하지 않기 위한 최소 장치 )
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");

    if (isRelative && !specifier.endsWith(".ts") && !specifier.endsWith(".json")) {
      return nextResolve(`${specifier}.ts`, context);
    }

    throw error;
  }
}
