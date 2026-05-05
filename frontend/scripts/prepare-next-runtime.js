const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function main() {
  if (process.platform !== "win32") {
    return;
  }

  const projectRoot = process.cwd();
  const projectNext = path.join(projectRoot, ".next");
  const runtimeRoot = "C:\\tmp\\crm-os-next-runtime";
  const runtimeNext = path.join(runtimeRoot, path.basename(projectRoot));

  ensureDir(runtimeNext);

  if (fs.existsSync(projectNext)) {
    const stat = fs.lstatSync(projectNext);
    if (stat.isSymbolicLink()) {
      return;
    }
    removeIfExists(projectNext);
  }

  // Use a junction to keep Next.js writes on local disk, avoiding flaky network-drive writes.
  fs.symlinkSync(runtimeNext, projectNext, "junction");
}

main();
