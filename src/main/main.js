const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

let mainWindow;
let tray = null;
let isQuiting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/sigma-bf-icon-256.png'),
    show: !app.getLoginItemSettings().wasOpenedAsHidden // OS起動時は非表示で開始
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // ウィンドウを閉じる時の処理（トレイに最小化）
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // ウィンドウが最小化された時もトレイに隠す
  mainWindow.on('minimize', () => {
    mainWindow.hide();
  });
}

// カメラ監視機能
let cameraMonitoringInterval = null;
let lastDetectedCamera = null;

function startCameraMonitoring() {
  // 5秒ごとにカメラをチェック
  cameraMonitoringInterval = setInterval(async () => {
    try {
      const currentCamera = await detectSigmaCamera();
      
      // カメラが新しく検知された場合
      if (currentCamera && !lastDetectedCamera) {
        console.log('BFカメラが新しく接続されました:', currentCamera);
        
        // ウィンドウをアクティブ化
        activateMainWindow();
        
        // レンダラープロセスにカメラ検知を通知
        if (mainWindow) {
          mainWindow.webContents.send('camera-connected', currentCamera);
        }
      }
      
      // カメラ状態を更新
      lastDetectedCamera = currentCamera;
      
    } catch (error) {
      console.error('カメラ監視エラー:', error);
    }
  }, 5000); // 5秒間隔
}

function stopCameraMonitoring() {
  if (cameraMonitoringInterval) {
    clearInterval(cameraMonitoringInterval);
    cameraMonitoringInterval = null;
  }
}

function activateMainWindow() {
  if (mainWindow) {
    // ウィンドウが最小化されている場合は復元
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    
    // ウィンドウを表示
    mainWindow.show();
    
    // ウィンドウをフォーカス
    mainWindow.focus();
    
    // トップレベルに表示
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
    
    console.log('メインウィンドウをアクティブ化しました');
  }
}

// システムトレイを作成する関数
function createTray() {
  const iconPath = path.join(__dirname, '../../assets/sigma-bf-icon-32.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Sigma BF Copy を表示',
      click: () => {
        mainWindow.show();
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    },
    {
      label: 'カメラを再検知',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('refresh-camera');
        }
      }
    },
    { type: 'separator' },
    {
      label: '起動時に自動開始',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true // 起動時は非表示で開始
        });
      }
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Sigma BF Copy - カメラファイル自動コピー');
  
  // ダブルクリックでウィンドウを表示
  tray.on('double-click', () => {
    mainWindow.show();
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // カメラ監視を開始
  startCameraMonitoring();
  
  // 初回起動時に自動起動を有効にするかユーザーに確認
  if (!app.getLoginItemSettings().openAtLogin && !process.argv.includes('--dev')) {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('ask-auto-start');
      }
    }, 2000);
  }
});

app.on('window-all-closed', () => {
  // トレイアプリとして動作するため、ウィンドウが全て閉じられても終了しない
  // macOSでもWindowsと同様の動作にする
});

app.on('before-quit', () => {
  // アプリ終了時にカメラ監視を停止
  stopCameraMonitoring();
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
    // コピー先フォルダパスを生成
    const { generateDestinationPath, classifyFileType } = require('../utils/file-manager');
    const photoDestPath = generateDestinationPath(photoDestination, folderName);
    const videoDestPath = generateDestinationPath(videoDestination, folderName);

    // コピー先フォルダを作成
    await fs.ensureDir(photoDestPath);
    await fs.ensureDir(videoDestPath);

    // ソースフォルダからファイル一覧を取得
    const sourceFiles = await fs.readdir(sourceFolderPath);
    
    // ファイル数を事前に計算
    let totalFilesToCopy = 0;
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(sourceFolderPath, fileName);
      try {
        const stats = await fs.stat(sourceFilePath);
        if (stats.isFile()) {
          totalFilesToCopy++;
        }
      } catch (error) {
        // ファイルアクセスエラーは無視
      }
    }
    
    const copyResults = {
      success: true,
      totalFiles: totalFilesToCopy,
      copiedPhotos: 0,
      copiedVideos: 0,
      errors: [],
      photoDestPath,
      videoDestPath
    };

    let copiedCount = 0;

    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(sourceFolderPath, fileName);
      try {
        const stats = await fs.stat(sourceFilePath);
        
        if (!stats.isFile()) continue;
        
        // ファイル拡張子で写真/動画を判定
        const fileType = classifyFileType(fileName);
        let destPath;
        
        if (fileType === 'photo') {
          destPath = path.join(photoDestPath, fileName);
        } else {
          destPath = path.join(videoDestPath, fileName);
        }

        // ファイルコピー
        await fs.copy(sourceFilePath, destPath, { 
          overwrite: false,
          errorOnExist: false 
        });
        
        if (fileType === 'photo') {
          copyResults.copiedPhotos++;
        } else {
          copyResults.copiedVideos++;
        }
        
        copiedCount++;
        
        // 進行状況を送信
        mainWindow.webContents.send('copy-progress', {
          current: copiedCount,
          total: totalFilesToCopy,
          fileName: fileName,
          percentage: Math.round((copiedCount / totalFilesToCopy) * 100)
        });
        
        console.log(`コピー完了: ${fileName} -> ${fileType} (${copiedCount}/${totalFilesToCopy})`);
        
      } catch (error) {
        console.error(`ファイルコピーエラー: ${fileName}`, error);
        copyResults.errors.push({
          fileName,
          error: error.message
        });
      }
    }

    console.log('コピー結果:', copyResults);
    return copyResults;
  } catch (error) {
    console.error('ファイルコピーエラー:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// 自動起動設定
ipcMain.handle('set-auto-start', (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: enabled // 自動起動時は非表示で開始
  });
  return true;
});