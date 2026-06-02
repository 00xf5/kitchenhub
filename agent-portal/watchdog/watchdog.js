#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Simple watchdog that restarts the agent executable when it exits.
// Configure via environment variables or CLI args:
//   --exe "C:\Path\To\KitchenHubAgent.exe"

function usage() {
  console.log('Usage: node watchdog.js --exe "C:\\path\\to\\KitchenHubAgent.exe"');
}

const argv = process.argv.slice(2);
let exePath = process.env.KH_AGENT_EXE;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--exe' && argv[i+1]) { exePath = argv[i+1]; i++; }
}

if (!exePath) {
  usage();
  process.exit(1);
}

exePath = path.resolve(exePath);
if (!fs.existsSync(exePath)) {
  console.error('[WATCHDOG] Agent executable not found:', exePath);
  process.exit(2);
}

console.log('[WATCHDOG] Monitoring agent executable:', exePath);

function spawnAgent() {
  console.log('[WATCHDOG] Spawning agent...');
  const child = spawn(exePath, [], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout && child.stdout.on('data', (d) => process.stdout.write('[AGENT] ' + d.toString()));
  child.stderr && child.stderr.on('data', (d) => process.stderr.write('[AGENT-ERR] ' + d.toString()));

  child.on('exit', (code, signal) => {
    console.warn(`[WATCHDOG] Agent exited (code=${code}, signal=${signal}). Restarting in 1000ms`);
    setTimeout(() => spawnAgent(), 1000);
  });

  child.on('error', (err) => {
    console.error('[WATCHDOG] Failed to spawn agent:', err.message);
    setTimeout(() => spawnAgent(), 5000);
  });
}

spawnAgent();

// Prevent watchdog from exiting
process.stdin.resume();
