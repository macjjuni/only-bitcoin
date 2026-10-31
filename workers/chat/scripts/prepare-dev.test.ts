import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { ensureChatDevVars } from "./prepare-dev.mjs";

const secretNames = [
  "ACTOR_SECRET",
  "ENFORCEMENT_SECRET",
  "IP_GUARD_SECRET",
  "PASS_SIGNING_SECRET",
];
const temporaryDirectories: string[] = [];

const createTemporaryDirectory = (): string => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "only-bitcoin-chat-dev-")));
  temporaryDirectories.push(directory);
  return directory;
};

const createScriptSandbox = () => {
  const directory = createTemporaryDirectory();
  const scriptDirectory = join(directory, "scripts");
  mkdirSync(scriptDirectory);
  const scriptPath = join(scriptDirectory, "prepare-dev.mjs");
  copyFileSync(fileURLToPath(new URL("./prepare-dev.mjs", import.meta.url)), scriptPath);

  return { directory, scriptPath, devVarsPath: join(directory, ".dev.vars") };
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("ensureChatDevVars", () => {
  it("최초 실행에만 0600 파일과 서로 다른 32바이트 키·로컬 Origin을 만든다", () => {
    const devVarsPath = join(createTemporaryDirectory(), ".dev.vars");
    const addedNames = ensureChatDevVars(devVarsPath);
    const values = parseEnv(readFileSync(devVarsPath, "utf8"));

    expect(new Set(addedNames)).toEqual(new Set([...secretNames, "CHAT_ALLOWED_ORIGINS"]));
    for (const secretName of secretNames) {
      expect(values[secretName]).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(new Set(secretNames.map((secretName) => values[secretName])).size).toBe(
      secretNames.length,
    );
    expect(values.CHAT_ALLOWED_ORIGINS).toBe("http://localhost:3002,http://127.0.0.1:3002");
    expect(statSync(devVarsPath).mode & 0o777).toBe(0o600);
  });

  it("새 파일마다 독립된 랜덤 키를 만든다", () => {
    const firstPath = join(createTemporaryDirectory(), ".dev.vars");
    const secondPath = join(createTemporaryDirectory(), ".dev.vars");
    ensureChatDevVars(firstPath);
    ensureChatDevVars(secondPath);
    const firstValues = parseEnv(readFileSync(firstPath, "utf8"));
    const secondValues = parseEnv(readFileSync(secondPath, "utf8"));

    for (const secretName of secretNames) {
      expect(secondValues[secretName]).not.toBe(firstValues[secretName]);
    }
  });

  it("반복 실행은 값과 파일 내용을 바꾸지 않는다", () => {
    const devVarsPath = join(createTemporaryDirectory(), ".dev.vars");
    ensureChatDevVars(devVarsPath);
    const originalContent = readFileSync(devVarsPath, "utf8");

    expect(ensureChatDevVars(devVarsPath)).toEqual([]);
    expect(readFileSync(devVarsPath, "utf8")).toBe(originalContent);
  });

  it("기존 따옴표·주석·사용자 설정을 그대로 보존하고 빠진 키만 뒤에 붙인다", () => {
    const devVarsPath = join(createTemporaryDirectory(), ".dev.vars");
    const originalContent = [
      "# Keep local customizations",
      'ACTOR_SECRET="actor#inside-quotes" # trailing comment',
      "export ENFORCEMENT_SECRET='existing enforcement' # preserved",
      'CHAT_ALLOWED_ORIGINS="http://localhost:4010"',
      "UNRELATED_VALUE=unchanged#inline-comment",
    ].join("\n");
    writeFileSync(devVarsPath, originalContent, { mode: 0o600 });
    const addedNames = ensureChatDevVars(devVarsPath);
    const updatedContent = readFileSync(devVarsPath, "utf8");
    const values = parseEnv(updatedContent);

    expect(new Set(addedNames)).toEqual(new Set(["IP_GUARD_SECRET", "PASS_SIGNING_SECRET"]));
    expect(updatedContent.startsWith(`${originalContent}\n`)).toBe(true);
    expect(values.ACTOR_SECRET).toBe("actor#inside-quotes");
    expect(values.ENFORCEMENT_SECRET).toBe("existing enforcement");
    expect(values.CHAT_ALLOWED_ORIGINS).toBe("http://localhost:4010");
    expect(values.UNRELATED_VALUE).toBe("unchanged");
  });

  it("마지막 dotenv 정의가 빈 값이면 앞의 값 대신 새 키를 보충한다", () => {
    const devVarsPath = join(createTemporaryDirectory(), ".dev.vars");
    const originalContent = [
      "ACTOR_SECRET=earlier-actor-value",
      'ACTOR_SECRET="" # a comment with "quoted words"',
      "ENFORCEMENT_SECRET=earlier-enforcement-value",
      "ENFORCEMENT_SECRET='last#nonempty-value' # ignored comment",
      "IP_GUARD_SECRET= # blank after trimming the comment",
      "PASS_SIGNING_SECRET='existing pass value'",
      "CHAT_ALLOWED_ORIGINS='' # defaults required",
    ].join("\n");
    writeFileSync(devVarsPath, originalContent, { mode: 0o600 });
    const addedNames = ensureChatDevVars(devVarsPath);
    const values = parseEnv(readFileSync(devVarsPath, "utf8"));

    expect(new Set(addedNames)).toEqual(
      new Set(["ACTOR_SECRET", "IP_GUARD_SECRET", "CHAT_ALLOWED_ORIGINS"]),
    );
    expect(values.ACTOR_SECRET).toMatch(/^[a-f0-9]{64}$/);
    expect(values.IP_GUARD_SECRET).toMatch(/^[a-f0-9]{64}$/);
    expect(values.ENFORCEMENT_SECRET).toBe("last#nonempty-value");
    expect(values.PASS_SIGNING_SECRET).toBe("existing pass value");
    expect(ensureChatDevVars(devVarsPath)).toEqual([]);
  });

  it("모듈 import는 기본 설정 파일을 만들거나 로그를 출력하지 않는다", () => {
    const { directory, scriptPath, devVarsPath } = createScriptSandbox();
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `await import(${JSON.stringify(pathToFileURL(scriptPath).href)});`,
      ],
      { cwd: directory, encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(existsSync(devVarsPath)).toBe(false);
  });

  it("CLI는 생성한 키 이름만 알리고 secret 값은 stdout·stderr에 노출하지 않는다", () => {
    const { directory, scriptPath, devVarsPath } = createScriptSandbox();
    const result = spawnSync(process.execPath, [scriptPath], { cwd: directory, encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(existsSync(devVarsPath)).toBe(true);
    const values = parseEnv(readFileSync(devVarsPath, "utf8"));
    for (const secretName of secretNames) {
      expect(result.stdout).toContain(secretName);
      expect(`${result.stdout}${result.stderr}`).not.toContain(values[secretName]);
    }
  });
});
