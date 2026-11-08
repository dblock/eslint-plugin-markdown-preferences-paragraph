import assert from "node:assert/strict";
import test from "node:test";
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
