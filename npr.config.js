import { HookValidator, IntrideaChangelog, MarkdownSection, ReleaseWorkflow } from "npm-package-release";

export function createReleaseWorkflow(services = {}) {
  return new ReleaseWorkflow({
    changelog: new IntrideaChangelog(),
    async prepare({ cwd, version }) {
      await new MarkdownSection("README.md", "## Installation").replace(
        /(eslint-plugin-markdown-preferences-paragraph@)\d+\.\d+\.\d+/gu,
        `$1${version}`,
        { cwd },
      );
    },
    validator: new HookValidator({
      async validateArtifact({ archive, run }) {
        await run("npm", ["run", "package:check"], {
          env: { PACKAGE_ARCHIVE: archive },
        });
      },
    }),
    ...services,
  });
}

export default createReleaseWorkflow();
