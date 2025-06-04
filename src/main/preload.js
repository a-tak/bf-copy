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
  
  // ファイルコピー
  copyFiles: (sourceFolder, photoDestination, videoDestination, folderName) => 
    ipcRenderer.invoke('copy-files', sourceFolder, photoDestination, videoDestination, folderName),
  
  // 進行状況イベント
  onCopyProgress: (callback) => ipcRenderer.on('copy-progress', callback)
});