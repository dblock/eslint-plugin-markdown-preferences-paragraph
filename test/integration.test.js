import test from "node:test";
import process from "node:process";
import { fixtures } from "../test-support/fixtures.js";
import { consumer } from "../test-support/consumer.js";

test("the packed plugin works with real ESLint file fixtures", async (suite) => {
  // Next-version validation clears the retained-archive override.
  const installed = await consumer(process.env.PACKAGE_ARCHIVE ?? process.env.PARAGRAPH_WRAP_PACKAGE_ARCHIVE ?? "");
  try {
    for (const fixture of await fixtures()) {
      await suite.test(fixture.name, () => installed.check(fixture));
    }
  } finally {
    await installed.close();
  }
});
