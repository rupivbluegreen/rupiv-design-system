// @vitest-environment node
import { fileURLToPath } from "node:url";
import stylelint from "stylelint";
import { expect, it } from "vitest";

// `pnpm test` runs Stylelint over every CSS file in src/, so physical CSS, a raw colour, a pixel font size or an
// ad-hoc shadow fails the test run and not only `pnpm lint:css`. The rules themselves are tested in
// stylelint-config.test.ts. This proves the rules hold for the source as it is: it cannot show that a
// right-to-left screen looks right.

const root = fileURLToPath(new URL("../", import.meta.url));

it("has no Stylelint warning in any CSS file under src/", { timeout: 120_000 }, async () => {
  const { results } = await stylelint.lint({
    files: `${root}src/**/*.css`,
    configFile: `${root}stylelint.config.mjs`,
  });

  const problems = results.flatMap((result) =>
    result.warnings.map(
      (warning) =>
        `${result.source?.replace(root, "") ?? "?"}:${warning.line}:${warning.column} ${warning.text}`,
    ),
  );
  // Fail with the list of warnings, not with a bare count.
  expect(problems, problems.join("\n")).toEqual([]);

  // A glob that matches nothing would pass by accident: the source has dozens of CSS files, tokens.css among them.
  const linted = results.map((result) => result.source?.replace(root, "") ?? "");
  expect(linted.length).toBeGreaterThan(40);
  expect(linted).toContain("src/styles/tokens.css");
  expect(linted).toContain("src/components/ui/button.module.css");
});
