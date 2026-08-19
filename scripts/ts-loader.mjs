/** `node --import ./scripts/ts-loader.mjs` 로 확장자 해석 훅을 등록한다. */
import { register } from "node:module";

register("./ts-extension-hook.mjs", import.meta.url);
