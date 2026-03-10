import path from "node:path";
import { fileURLToPath } from "node:url";
import iconGen from "icon-gen";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, "..", "build");
const iconSource = path.join(buildDir, "icon.svg");

const results = await iconGen(iconSource, buildDir, {
  report: true,
  ico: {
    name: "icon"
  },
  icns: {
    name: "icon"
  }
});

console.log(`Generated installer icons from ${iconSource}.`);
for (const result of results) {
  console.log(` - ${result}`);
}
