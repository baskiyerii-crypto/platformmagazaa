const { execSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const caches = [
  path.join(root, ".expo"),
  path.join(root, "node_modules", ".cache"),
  path.join(root, "..", "..", "node_modules", ".cache"),
];

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

function syncEnv() {
  const ip = getLocalIp();
  const apiUrl = `http://${ip}:3000`;
  const envPath = path.join(root, ".env");
  fs.writeFileSync(envPath, `EXPO_PUBLIC_API_URL=${apiUrl}\n`, "utf8");
  console.log("API URL guncellendi:", apiUrl);
  return apiUrl;
}

function ensureFirewallRule() {
  try {
    execSync(
      'netsh advfirewall firewall show rule name="Magaza Web Dev 3000"',
      { stdio: "pipe" }
    );
  } catch {
    try {
      execSync(
        'netsh advfirewall firewall add rule name="Magaza Web Dev 3000" dir=in action=allow protocol=TCP localport=3000',
        { stdio: "inherit" }
      );
      console.log("Windows Firewall: port 3000 acildi");
    } catch {
      console.warn(
        "Windows Firewall kurali eklenemedi. Yonetici olarak calistirin veya port 3000'i manuel acin."
      );
    }
  }
}

for (const dir of caches) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("Silindi:", dir);
  }
}

syncEnv();
ensureFirewallRule();

try {
  execSync("npx --yes kill-port 8081 8082 8090", { stdio: "inherit", cwd: root });
} catch {
  // port zaten bos olabilir
}

console.log("Metro baslatiliyor (port 8090, cache temiz)...");
console.log("Telefonda Expo Go: uygulamayi silip yeniden acin veya Reload (shake -> Reload).");

const child = spawn("npx", ["expo", "start", "-c", "--port", "8090"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
