import { spawn } from "node:child_process";

const STEPS = [
  "shock",
  "market:data",
  "divergence",
  "snapshot"
];

const npmCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log("");
    console.log(`==> npm run ${scriptName}`);

    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run ${scriptName}`]
      : ["run", scriptName];

    const child = spawn(npmCommand, args, {
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm run ${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  for (const step of STEPS) {
    await runNpmScript(step);
  }

  console.log("");
  console.log("Daily CRUCIX protocol complete.");
}

main().catch((error) => {
  console.error("");
  console.error("daily run failed:");
  console.error(error.message);
  process.exitCode = 1;
});
