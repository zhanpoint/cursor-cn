import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const runKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const runName = 'CursorChineseLocalization';

function stateFiles(directory: string) {
  return { lock: path.join(directory, '.cursor-cn-watch.json'), launcher: path.join(directory, '.cursor-cn-watch.vbs') };
}

function isUpdateWatcher(pid: number, directory: string) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  // A stale PID can belong to another application after a reboot.
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    '$p=Get-CimInstance Win32_Process -Filter ("ProcessId="+$env:CURSOR_CN_WATCH_PID); if($p){$p | Select-Object ExecutablePath,CommandLine | ConvertTo-Json -Compress}'], {
    encoding: 'utf8', windowsHide: true,
    env: { ...process.env, CURSOR_CN_WATCH_PID: String(pid) },
  });
  try {
    const info = JSON.parse(result.stdout);
    return info.ExecutablePath?.toLowerCase() === process.execPath.toLowerCase() &&
      info.CommandLine?.includes(path.join(directory, 'cursor-cn.ts')) && info.CommandLine.includes('--watch-updates');
  } catch { return false; }
}

export function stopUpdateWatch(directory: string) {
  const { lock } = stateFiles(directory);
  try {
    const { pid } = JSON.parse(fs.readFileSync(lock, 'utf8'));
    if (isUpdateWatcher(pid, directory)) process.kill(pid);
  } catch { /* Already stopped. */ }
  fs.rmSync(lock, { force: true });
}

export function configureUpdateWatch(directory: string, enabled: boolean) {
  if (process.platform !== 'win32') return;
  const { launcher } = stateFiles(directory);
  if (!enabled) {
    spawnSync('reg.exe', ['delete', runKey, '/v', runName, '/f'], { windowsHide: true, encoding: 'utf8' });
    stopUpdateWatch(directory);
    fs.rmSync(launcher, { force: true });
    return;
  }
  const command = `"${process.execPath}" "${path.join(directory, 'cursor-cn.ts')}" --watch-updates`;
  fs.writeFileSync(launcher, `CreateObject("WScript.Shell").Run "${command.replaceAll('"', '""')}", 0, False\r\n`);
  const result = spawnSync('reg.exe', ['add', runKey, '/v', runName, '/t', 'REG_SZ', '/d', `wscript.exe "${launcher}"`, '/f'], { windowsHide: true, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`无法启用登录后自动汉化：${result.stderr || result.error}`);
  spawn(process.execPath, [path.join(directory, 'cursor-cn.ts'), '--watch-updates'], {
    detached: true, stdio: 'ignore', windowsHide: true,
  }).unref();
}

// Require a complete, unchanged application snapshot before touching updater output.
export function repairGate() {
  let previous = '';
  let attempted = '';
  return (snapshot: string | null, healthy: boolean) => {
    if (!snapshot || healthy) {
      previous = '';
      attempted = '';
      return false;
    }
    const ready = snapshot === previous && snapshot !== attempted;
    previous = snapshot;
    if (ready) attempted = snapshot;
    return ready;
  };
}

export function runUpdateWatch(directory: string, installDir: string) {
  const { lock } = stateFiles(directory);
  try {
    const state = JSON.parse(fs.readFileSync(lock, 'utf8'));
    if (isUpdateWatcher(state.pid, directory)) return;
  } catch { fs.rmSync(lock, { force: true }); }
  fs.rmSync(lock, { force: true });
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx' });
  const app = path.join(installDir, 'resources', 'app');
  const workbench = path.join(app, 'out', 'vs', 'code', 'electron-sandbox', 'workbench');
  const gate = repairGate();
  let repairing = false;
  const timer = setInterval(() => {
    if (repairing) return;
    try {
      const html = fs.readFileSync(path.join(workbench, 'workbench.html'), 'utf8');
      const product = JSON.parse(fs.readFileSync(path.join(app, 'product.json'), 'utf8'));
      const files = ['Cursor.exe', 'resources/app/out/main.js', 'resources/app/package.json',
        'resources/app/out/vs/code/electron-sandbox/workbench/workbench.html'];
      const snapshot = JSON.stringify([product.commit, ...files.map(file => {
        const stat = fs.statSync(path.join(installDir, file));
        return [stat.size, stat.mtimeMs];
      })]);
      const healthy = html.includes('<!-- CURSOR_LOCALIZATION_INJECTION -->') &&
        fs.existsSync(path.join(workbench, 'Cursor_Localization.js'));
      if (!gate(snapshot, healthy)) return;
      repairing = true;
      const running = spawnSync('tasklist.exe', ['/FI', 'IMAGENAME eq Cursor.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
      const args = [path.join(directory, 'cursor-cn.ts'), '--auto-repair'];
      if (!running.stdout?.includes('"Cursor.exe"')) args.push('--no-restart');
      const log = fs.openSync(path.join(directory, '.cursor-cn-watch.log'), 'a');
      const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', log, log] });
      fs.closeSync(log);
      child.once('error', () => { repairing = false; });
      child.once('exit', () => { repairing = false; });
    } catch { gate(null, false); /* Updater may temporarily remove files. */ }
  }, 5000);
  process.once('exit', () => { clearInterval(timer); fs.rmSync(lock, { force: true }); });
}
