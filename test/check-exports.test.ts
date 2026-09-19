// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { checkExports } from "../scripts/check-exports.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const scratch: string[] = [];

function makePackage(exportsField: unknown, files: string[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), "check-exports-"));
  scratch.push(dir);
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x", exports: exportsField }));
  for (const file of files) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), "");
  }
  return dir;
}

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("check-exports", () => {
  it("passes when every target exists, including conditions and arrays", () => {
    const dir = makePackage(
      { ".": "./src/index.ts", "./styles.css": { default: "./src/a.css" }, "./x": ["./src/x.ts"] },
      ["src/index.ts", "src/a.css", "src/x.ts"],
    );
    expect(checkExports(dir)).toEqual({ checked: 3, problems: [] });
  });

  it("reports a target that does not exist", () => {
    const dir = makePackage({ ".": "./src/index.ts", "./tokens": "./src/tokens.ts" }, ["src/index.ts"]);
    const { problems } = checkExports(dir);
    expect(problems).toEqual(['exports "./tokens": "./src/tokens.ts" does not exist']);
  });

  it("reports a directory as missing and a target without ./", () => {
    const dir = makePackage({ ".": "./src", "./b": "src/b.ts" }, ["src/b.ts"]);
    const { problems } = checkExports(dir);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('"./src" does not exist');
    expect(problems[1]).toContain('must start with "./"');
  });

  it("reports pattern targets instead of silently accepting them", () => {
    const dir = makePackage({ "./*": "./src/*.ts" }, ["src/a.ts"]);
    expect(checkExports(dir).problems[0]).toContain("pattern target");
  });

  it("fails when there is no exports field", () => {
    const dir = makePackage(undefined, []);
    expect(checkExports(dir).problems).toEqual(['package.json has no "exports"']);
  });

  it("passes for this package: every exports target exists", () => {
    const { checked, problems } = checkExports(repoRoot);
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(6);
  });
});
