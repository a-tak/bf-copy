const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 設定関連
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // UI関連
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // カメラ検知
  detectSigmaCamera: () => ipcRenderer.invoke('detect-sigma-camera'),
  
  // カメラフォルダ取得
  getCameraFolders: (cameraPath) => ipcRenderer.invoke('get-camera-folders', cameraPath),
  
  // フォルダサムネイル取得
  getFolderThumbnails: (folderPath) => ipcRenderer.invoke('get-folder-thumbnails', folderPath),
  
  // フルサイズ画像取得
  getFullSizeImage: (imagePath) => ipcRenderer.invoke('get-full-size-image', imagePath),
  
  // ファイルコピー
  copyFiles: (sourceFolder, photoDestination, videoDestination, folderName) => 
    ipcRenderer.invoke('copy-files', sourceFolder, photoDestination, videoDestination, folderName),
  
  // 進行状況イベント
  onCopyProgress: (callback) => ipcRenderer.on('copy-progress', callback),
  
  // トレイ・自動起動関連
  onAskAutoStart: (callback) => ipcRenderer.on('ask-auto-start', callback),
  onRefreshCamera: (callback) => ipcRenderer.on('refresh-camera', callback),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  
  // カメラ接続イベント
  onCameraConnected: (callback) => ipcRenderer.on('camera-connected', callback)
});