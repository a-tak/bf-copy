const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 設定ファイルのパス
const configPath = path.join(os.homedir(), '.sigma-bf-copy', 'config.json');

// 設定読み込み
ipcMain.handle('load-config', async () => {
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    return null;
  } catch (error) {
    console.error('設定読み込みエラー:', error);
    return null;
  }
});

// 設定保存
ipcMain.handle('save-config', async (event, config) => {
  try {
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('設定保存エラー:', error);
    return false;
  }
});

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// USB ドライブ検知（後で実装）
ipcMain.handle('detect-sigma-camera', async () => {
  // TODO: USB検知ロジックを実装
  return null;
});

// ファイルコピー（後で実装）
ipcMain.handle('copy-files', async (event, sourceFolder, photoDestination, videoDestination, folderName) => {
  // TODO: ファイルコピーロジックを実装
  return { success: false, message: '未実装' };
});