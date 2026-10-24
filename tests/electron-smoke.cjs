const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

// 実行中の通常版・カメラ・自動起動設定に触れない、実 Electron の互換性検証。
const root = path.resolve(__dirname, '..');
const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-copy-electron-smoke-'));
const userData = path.join(isolated, 'electron');
fs.mkdirSync(userData, { recursive: true });
os.homedir = () => isolated;
os.tmpdir = () => isolated;
app.setName('BF Copy compatibility verification');
app.setPath('userData', userData);

const autoStart = require('../src/utils/auto-start-manager');
autoStart.cleanupOldAutoStartSettings = () => {};
autoStart.getAutoStartStatus = () => ({ openAtLogin: false, openAsHidden: false });
autoStart.logAutoStartDetails = () => {};
autoStart.setAutoStart = () => { throw new Error('検証中の自動起動変更は禁止です'); };
require('../src/utils/camera-detector').detectSigmaCamera = async () => null;

const report = { checks: [], errors: [] };
let finished = false;
function finish(error) {
  if (finished) return;
  finished = true;
  if (error) report.errors.push(error.stack || String(error));
  console.log(JSON.stringify(report, null, 2));
  app.exit(error ? 1 : 0);
}
process.on('uncaughtException', finish);
process.on('unhandledRejection', finish);
setTimeout(() => finish(new Error('Electron smoke timed out')), 30000);

app.once('browser-window-created', (_event, window) => {
  window.webContents.on('preload-error', (_event, _file, error) => finish(error));
  window.webContents.once('did-finish-load', async () => {
    try {
      assert.equal(window.getTitle(), 'BF Copy');
      report.checks.push('renderer loaded');
      const config = {
        photoDestination: path.join(isolated, 'photos'),
        videoDestination: path.join(isolated, 'videos'),
        convertRw2ToDng: true
      };
      const result = await window.webContents.executeJavaScript(`(async () => {
        const api = window.electronAPI;
        if (typeof api?.getAppVersion !== 'function') throw Error('preload bridge missing');
        const initial = await api.loadConfig();
        const saved = await api.saveConfig(${JSON.stringify(config)});
        return { initial, saved, config: await api.loadConfig(), version: await api.getAppVersion(), nodeExposed: typeof require !== 'undefined' };
      })()`);
      assert.equal(result.initial, null);
      assert.equal(result.saved, true);
      assert.deepEqual(result.config, config);
      assert.equal(result.version, require('../package.json').version);
      assert.equal(result.nodeExposed, false);
      report.checks.push('preload and isolated config IPC roundtrip', 'renderer has no Node require');
      assert.equal(app.getPath('userData'), userData);
      assert(fs.existsSync(path.join(isolated, '.sigma-bf-copy', 'config.json')));
      report.checks.push('settings and Electron profile remain isolated');
      const sharp = require('sharp');
      const image = await sharp({ create: { width: 16, height: 12, channels: 4, background: '#336699' } }).png().toBuffer();
      const metadata = await sharp(image).metadata();
      assert.equal(metadata.width, 16);
      assert.equal(metadata.height, 12);
      report.checks.push('native sharp PNG encode and decode');
      report.version = result.version;
      report.electron = process.versions.electron;
      report.node = process.versions.node;
      finish();
    } catch (error) {
      finish(error);
    }
  });
});
require('../src/main/main');
