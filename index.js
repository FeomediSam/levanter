const { spawnSync, spawn } = require('child_process')
const { existsSync, writeFileSync } = require('fs')
const path = require('path')

// 🔹 Add as many sessions as you like here
const SESSIONS = [
  { id: '', name: 'levanter1', folder: 'levanter1' },  
  // add more sessions like above
]

// ──────────────────────────────────────────────
// Install Dependencies
function installDependencies(folder) {
  console.log(`[${folder}] Installing dependencies...`)
  const installResult = spawnSync(
    'yarn',
    ['install', '--force', '--non-interactive', '--network-concurrency', '3'],
    {
      cwd: folder,
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    }
  )

  if (installResult.error || installResult.status !== 0) {
    console.error(`[${folder}] Failed to install dependencies`)
    process.exit(1)
  }
}

// ──────────────────────────────────────────────
// Check Dependencies
function checkDependencies(folder) {
  if (!existsSync(path.resolve(folder, 'package.json'))) {
    console.error(`[${folder}] package.json not found!`)
    process.exit(1)
  }

  const result = spawnSync('yarn', ['check', '--verify-tree'], { cwd: folder, stdio: 'inherit' })
  if (result.status !== 0) {
    console.log(`[${folder}] Dependencies missing or broken, reinstalling...`)
    installDependencies(folder)
  }
}

// ──────────────────────────────────────────────
// Clone Repository + Write Config
function cloneRepository(folder, sessionId) {
  console.log(`[${folder}] Cloning repository...`)
  const cloneResult = spawnSync(
    'git',
    ['clone', 'https://github.com/lyfe00011/levanter.git', folder],
    { stdio: 'inherit' }
  )

  if (cloneResult.error) {
    throw new Error(`Failed to clone repo into ${folder}: ${cloneResult.error.message}`)
  }

  const configPath = path.join(folder, 'config.env')
  try {
    writeFileSync(configPath, `VPS=true\nSESSION_ID=${sessionId}`)
    console.log(`[${folder}] config.env written with session ID`)
  } catch (err) {
    throw new Error(`Failed to write config.env in ${folder}: ${err.message}`)
  }

  installDependencies(folder)
}

// ──────────────────────────────────────────────
// Start with PM2
function startPm2(folder, name) {
  console.log(`[${folder}] Starting with PM2 (name: ${name})...`)
  const pm2 = spawn('yarn', ['pm2', 'start', 'index.js', '--name', name, '--attach'], {
    cwd: folder,
    stdio: 'inherit',
  })

  pm2.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${folder}] pm2 failed to start. You may need to check logs.`)
    }
  })

  pm2.on('error', (error) => {
    console.error(`[${folder}] yarn pm2 error: ${error.message}`)
  })
}

// ──────────────────────────────────────────────
// Main Runner
for (const { id, name, folder } of SESSIONS) {
  if (!existsSync(folder)) {
    cloneRepository(folder, id)
    checkDependencies(folder)
  } else {
    checkDependencies(folder)
  }
  startPm2(folder, name)
}
