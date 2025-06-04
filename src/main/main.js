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

// USB ドライブ検知
ipcMain.handle('detect-sigma-camera', async () => {
  try {
    const os = require('os');
    const path = require('path');
    
    // Windowsでドライブ一覧を取得
    if (os.platform() === 'win32') {
      const drives = [];
      
      // A-Z までのドライブレターをチェック
      for (let i = 65; i <= 90; i++) {
        const driveLetter = String.fromCharCode(i);
        const drivePath = `${driveLetter}:\\`;
        
        try {
          // ドライブが存在するかチェック
          const stats = await fs.stat(drivePath);
          if (stats.isDirectory()) {
            // DCIMフォルダの存在をチェック
            const dcimPath = path.join(drivePath, 'DCIM');
            if (await fs.pathExists(dcimPath)) {
              drives.push({
                drive: driveLetter,
                path: drivePath,
                dcimPath: dcimPath,
                label: await getDriveLabel(drivePath)
              });
            }
          }
        } catch (error) {
          // ドライブが存在しない、またはアクセスできない
          continue;
        }
      }
      
      // デバッグ用: 見つかったドライブを全てログ出力
      console.log('見つかったDCIMドライブ:', drives);
      
      // Sigma BFを探す
      const sigmaDrive = drives.find(drive => 
        drive.label && drive.label.toLowerCase().includes('sigma')
      );
      
      console.log('Sigma BFカメラ:', sigmaDrive);
      
      return sigmaDrive || drives[0] || null; // テスト用に最初のDCIMドライブを返す
    }
    
    return null;
  } catch (error) {
    console.error('カメラ検知エラー:', error);
    return null;
  }
});

// ドライブラベルを取得する関数
async function getDriveLabel(drivePath) {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const driveLetter = drivePath.replace(':\\', '');
    
    // chcpでコードページを変更してからvolコマンドを実行
    const { stdout } = await execPromise(`chcp 65001 >nul && vol ${driveLetter}:`, { 
      encoding: 'utf8' 
    });
    
    console.log(`vol ${driveLetter}: 出力:`, stdout);
    
    // PowerShellでWMIを使用する方法（より確実）
    const { stdout: psOutput } = await execPromise(
      `powershell -Command "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${driveLetter}:'} | Select-Object -ExpandProperty VolumeName"`,
      { encoding: 'utf8' }
    );
    
    const label = psOutput.trim();
    console.log(`PowerShell ラベル取得: "${label}"`);
    
    return label;
  } catch (error) {
    console.error('ドライブラベル取得エラー:', error);
    return '';
  }
}

// カメラフォルダ一覧取得
ipcMain.handle('get-camera-folders', async (event, cameraPath) => {
  try {
    const dcimPath = path.join(cameraPath, 'DCIM');
    
    // DCIMフォルダ内のディレクトリを取得
    const items = await fs.readdir(dcimPath, { withFileTypes: true });
    const folders = [];
    
    for (const item of items) {
      if (item.isDirectory()) {
        const folderPath = path.join(dcimPath, item.name);
        
        // フォルダ内のファイル数を取得
        try {
          const files = await fs.readdir(folderPath);
          const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|dng|mov|mp4)$/i.test(file)
          );
          
          // 日付フォルダの形式をチェック (YYMMDD_N)
          const dateMatch = item.name.match(/^(\d{6})_(\d+)$/);
          let displayDate = item.name;
          
          if (dateMatch) {
            const [, yymmdd, index] = dateMatch;
            const year = 2000 + parseInt(yymmdd.substr(0, 2));
            const month = yymmdd.substr(2, 2);
            const day = yymmdd.substr(4, 2);
            displayDate = `${year}-${month}-${day}`;
          }
          
          folders.push({
            name: item.name,
            path: folderPath,
            files: imageFiles.length,
            date: displayDate,
            size: await getFolderSize(folderPath)
          });
        } catch (error) {
          console.error(`フォルダアクセスエラー: ${folderPath}`, error);
        }
      }
    }
    
    // 日付順でソート（新しい順）
    folders.sort((a, b) => b.name.localeCompare(a.name));
    
    console.log('カメラフォルダ一覧:', folders);
    return folders;
  } catch (error) {
    console.error('カメラフォルダ取得エラー:', error);
    return [];
  }
});

// フォルダサイズを取得する関数
async function getFolderSize(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      } catch (error) {
        // ファイルアクセスエラーは無視
      }
    }
    
    return formatFileSize(totalSize);
  } catch (error) {
    return '不明';
  }
}

// ファイルサイズをフォーマットする関数
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ファイルコピー
ipcMain.handle('copy-files', async (event, sourceFolderPath, photoDestination, videoDestination, folderName) => {
  try {
    console.log('コピー開始:', {
      source: sourceFolderPath,
      photoDestination,
      videoDestination,
      folderName
    });

    // 現在の日付でフォルダ名を作成
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const photoFolderName = `${dateString}_${folderName}`;
    const videoFolderName = `${dateString}_${folderName}`;

    // コピー先フォルダパスを作成
    const photoDestPath = path.join(photoDestination, photoFolderName, 'BF');
    const videoDestPath = path.join(videoDestination, videoFolderName, 'BF');

    // コピー先フォルダを作成
    await fs.ensureDir(photoDestPath);
    await fs.ensureDir(videoDestPath);

    // ソースフォルダからファイル一覧を取得
    const sourceFiles = await fs.readdir(sourceFolderPath);
    
    const copyResults = {
      totalFiles: 0,
      copiedPhotos: 0,
      copiedVideos: 0,
      errors: [],
      photoDestPath,
      videoDestPath
    };

    let copiedCount = 0;

    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(sourceFolderPath, fileName);
      const stats = await fs.stat(sourceFilePath);
      
      if (!stats.isFile()) continue;

      copyResults.totalFiles++;
      
      // ファイル拡張子で写真/動画を判定
      const ext = path.extname(fileName).toLowerCase();
      let destPath;
      let isPhoto = false;
      
      if (['.jpg', '.jpeg', '.dng', '.raw', '.tiff', '.tif', '.heif', '.heic'].includes(ext)) {
        destPath = path.join(photoDestPath, fileName);
        isPhoto = true;
      } else if (['.mov', '.mp4', '.avi', '.mkv', '.m4v'].includes(ext)) {
        destPath = path.join(videoDestPath, fileName);
        isPhoto = false;
      } else {
        // 不明な拡張子は写真として扱う
        destPath = path.join(photoDestPath, fileName);
        isPhoto = true;
      }

      try {
        // ファイルコピー
        await fs.copy(sourceFilePath, destPath, { 
          overwrite: false, // 既存ファイルは上書きしない
          errorOnExist: false 
        });
        
        if (isPhoto) {
          copyResults.copiedPhotos++;
        } else {
          copyResults.copiedVideos++;
        }
        
        copiedCount++;
        
        // 進行状況を送信
        mainWindow.webContents.send('copy-progress', {
          current: copiedCount,
          total: copyResults.totalFiles,
          fileName: fileName,
          percentage: Math.round((copiedCount / copyResults.totalFiles) * 100)
        });
        
        console.log(`コピー完了: ${fileName} -> ${isPhoto ? '写真' : '動画'}`);
        
      } catch (error) {
        console.error(`ファイルコピーエラー: ${fileName}`, error);
        copyResults.errors.push({
          fileName,
          error: error.message
        });
      }
    }

    console.log('コピー結果:', copyResults);
    
    return {
      success: true,
      ...copyResults
    };

  } catch (error) {
    console.error('コピー処理エラー:', error);
    return {
      success: false,
      message: error.message
    };
  }
});