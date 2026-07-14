const { execSync, spawn } = require("child_process");

function killPort3000() {
  try {
    const out = execSync('netstat -ano | findstr :3000 | findstr LISTENING', {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const pids = [
      ...new Set(
        out
          .trim()
          .split("\n")
          .map((line) => line.trim().split(/\s+/).pop())
          .filter(Boolean),
      ),
    ];
    for (const id of pids) {
      try {
        execSync(`taskkill /PID ${id} /F`, { stdio: "ignore" });
        console.log(`Port 3000 kullanan süreç kapatıldı (PID ${id})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* port free */
  }
}

killPort3000();

const child = spawn("next", ["dev", "--turbopack", "--port", "3000"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
