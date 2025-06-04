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
    icon: path.join(__dirname, '../../assets/sigma-bf-icon-256.png')
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

// TDD実装済みのユーティリティモジュールを使用
const { loadConfig, saveConfig } = require('../utils/config-manager');

// 設定読み込み
ipcMain.handle('load-config', async () => {
  return await loadConfig();
});

// 設定保存
ipcMain.handle('save-config', async (event, config) => {
  return await saveConfig(config);
});

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// TDD実装済みのカメラ検知モジュールを使用
const { detectSigmaCamera } = require('../utils/camera-detector');

// USB ドライブ検知
ipcMain.handle('detect-sigma-camera', async () => {
  return await detectSigmaCamera();
});

// getDriveLabel関数はutilsモジュールに移動済み

// TDD実装済みのファイル管理モジュールを使用
const { getCameraFolders } = require('../utils/file-manager');

// カメラフォルダ一覧取得
ipcMain.handle('get-camera-folders', async (event, cameraPath) => {
  return await getCameraFolders(cameraPath);
});

// フォルダサイズとファイルサイズフォーマット関数はutilsモジュールに移動済み

// TDD実装済みのファイルコピー機能を使用
const { copyFiles } = require('../utils/file-manager');

// ファイルコピー（進行状況通知付き）
ipcMain.handle('copy-files', async (event, sourceFolderPath, photoDestination, videoDestination, folderName) => {
  try {
    const result = await copyFiles(sourceFolderPath, photoDestination, videoDestination, folderName);
    
    // 進行状況通知機能は後で追加可能
    // 現在はシンプルな実装でテストを通す
    
    return result;
  } catch (error) {
    console.error('ファイルコピーエラー:', error);
    return {
      success: false,
      message: error.message
    };
  }
});