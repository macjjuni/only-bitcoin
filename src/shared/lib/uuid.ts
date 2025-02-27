import { stringUtil } from "kku-util";

const { getUuid } = stringUtil;

export function generateUUID() {
  return getUuid();
}