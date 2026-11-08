import test from "node:test";
import { fixtures } from "../test-support/fixtures.js";
import { consumer } from "../test-support/consumer.js";

test("the packed plugin works with real ESLint file fixtures", async (suite) => {
  const installed = await consumer();
  try {
    for (const fixture of await fixtures()) {
      await suite.test(fixture.name, () => installed.check(fixture));
    }
  } finally {
    await installed.close();
  }
});
