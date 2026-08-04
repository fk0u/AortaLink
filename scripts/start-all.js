import { spawn, execSync } from 'child_process';

console.log('🚀 [AortaLink] Memulai Server Express Backend (MongoDB Atlas) & Frontend App...');

// Safely clear port 5000 if occupied by previous instances
try {
  if (process.platform === 'win32') {
    execSync('powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' });
  }
} catch {
  // ignore
}

// Start Backend Express Server
const serverProcess = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true,
});

// Start Frontend Dev Server
const clientProcess = spawn('npx', ['rsbuild', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

function shutdown() {
  console.log('\n🛑 Mematikan AortaLink Backend & Frontend Server...');
  serverProcess.kill('SIGINT');
  clientProcess.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
