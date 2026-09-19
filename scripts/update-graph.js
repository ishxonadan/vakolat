const { spawnSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")

const root = path.join(__dirname, "..")
const localBin = path.join(os.homedir(), ".local", "bin")
const exeName = process.platform === "win32" ? "graphify.exe" : "graphify"
const localExe = path.join(localBin, exeName)

const env = { ...process.env }
const pathKey = env.PATH ? "PATH" : env.Path ? "Path" : "PATH"
env[pathKey] = `${localBin}${path.delimiter}${env[pathKey] || ""}`

const command = fs.existsSync(localExe) ? localExe : "graphify"
const result = spawnSync(command, ["update", "."], {
  cwd: root,
  env,
  stdio: "inherit",
})

if (result.error && result.error.code === "ENOENT") {
  console.error("graphify is not installed. Install it with: uv tool install graphifyy")
  process.exit(1)
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1)
}

const globalResult = spawnSync(
  command,
  ["global", "add", "graphify-out/graph.json", "--as", "vakolat"],
  { cwd: root, env, stdio: "inherit" }
)

process.exit(globalResult.status ?? 1)
