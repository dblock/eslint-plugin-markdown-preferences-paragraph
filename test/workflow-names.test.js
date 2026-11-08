import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkWorkflowNames } from "../scripts/check-workflow-names.js";

test("accepts title case while preserving proper names and expressions", () => {
  assert.deepEqual(
    checkWorkflowNames(`
name: Setup and Validation
env:
  name: arbitrary environment value
jobs:
  lower-case-id:
    name: Test on \${{ matrix.os }}
    strategy:
      matrix:
        name: [arbitrary matrix value]
    steps:
      - name: Run ESLint and npm Tests
        run: npm test
      - name: Check \`package.json\`
        run: npm run package:check
`),
    [],
  );
});

test("reports only workflow, job, and step display-name capitalization", () => {
  const errors = checkWorkflowNames(`
name: setup and validation
jobs:
  test:
    name: run tests
    steps:
      - name: install dependencies
        run: npm ci
`);
  assert.deepEqual(
    errors.map((error) => error.path),
    ["name", "jobs.test.name", "jobs.test.steps[0].name"],
  );
});

test("rejects invalid YAML and non-string display names", () => {
  assert.throws(() => checkWorkflowNames("name: Test\nname: Lint\n"));
  assert.equal(checkWorkflowNames("name: 123\n").length, 1);
});

async function runChecker(files) {
  const directory = await mkdtemp(join(tmpdir(), "workflow-names-consumer-"));
  try {
    const workflows = join(directory, ".github/workflows");
    await mkdir(workflows, { recursive: true });
    await Promise.all(Object.entries(files).map(([name, text]) =>
      writeFile(join(workflows, name), text)
    ));
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("../scripts/check-workflow-names.js", import.meta.url)),
    ], { cwd: directory, encoding: "utf8" });
    assert.ifError(result.error);
    return result;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("CLI accepts omitted display names and ignores non-YAML files", async () => {
  const result = await runChecker({
    "test.yml": `jobs:
  reuse:
    uses: ./.github/workflows/reusable.yml
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`,
    "notes.txt": "name: not title case\n",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("CLI reports names and parse errors in sorted order and continues checking", async () => {
  const result = await runChecker({
    "c-blank.yml": 'name: " "\n',
    "b-invalid.yaml": "name: Test\nname: Lint\n",
    "a-names.yml": "name: run tests\n",
  });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, "");
  const lines = result.stderr.trim().split("\n");
  assert.equal(lines[0], '.github/workflows/a-names.yml: name: Use title case for "run tests".');
  assert.match(result.stderr, /\.github\/workflows\/b-invalid\.yaml: /u);
  assert.equal(lines.at(-1), ".github/workflows/c-blank.yml: name: Display names must be nonempty strings.");
});
