const { execSync } = require("child_process");
const { join } = require("path");

const cwd = __dirname;
const env = { ...process.env, PATH: "C:\\Program Files\\nodejs;" + process.env.PATH, API_PORT: "3001" };

try {
  execSync("npx concurrently \"next dev\" \"tsx server/index.ts\"", {
    cwd,
    env,
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}
