import { readFileSync } from "node:fs";
import wrap from "./rules/wrap.js";
import maxWords from "./rules/max-words.js";

const { name, version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

export default {
  meta: { name, version },
  rules: { wrap, "max-words": maxWords },
};
