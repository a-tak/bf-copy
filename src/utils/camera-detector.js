// カメラ検知ユーティリティ
// TDD: テストで要求された関数のスタブを作成

// この関数群はテストをパスするために実装される

async function detectCameraWithDCIM() {
  // テストで要求されたDCIMフォルダを持つドライブ検知機能を実装
  const fs = require('fs-extra');
  const path = require('path');
  const os = require('os');
  
  try {
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
      
      return drives.length > 0 ? drives[0] : null;
    }
    
    return null;
  } catch (error) {
    console.error('カメラ検知エラー:', error);
    return null;
  }
}

async function detectSigmaCamera() {
  // テストで要求されたSigma BFカメラ優先検知機能を実装
  const fs = require('fs-extra');
  const path = require('path');
  const os = require('os');
  
  try {
    if (os.platform() === 'win32') {
      const drives = [];
      
      // A-Z までのドライブレターをチェック
      for (let i = 65; i <= 90; i++) {
        const driveLetter = String.fromCharCode(i);
        const drivePath = `${driveLetter}:\\`;
        
        try {
          const stats = await fs.stat(drivePath);
          if (stats.isDirectory()) {
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
          continue;
        }
      }
      
      // Sigma BFを探す
      const sigmaDrive = drives.find(drive => 
        drive.label && drive.label.toLowerCase().includes('sigma')
      );
      
      return sigmaDrive || drives[0] || null; // Sigmaが見つからない場合は最初のDCIMドライブを返す
    }
    
    return null;
  } catch (error) {
    console.error('Sigma カメラ検知エラー:', error);
    return null;
  }
}

async function getDriveLabel(drivePath) {
  // テストで要求されたドライブラベル取得機能を実装
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const driveLetter = drivePath.replace(':\\', '');
    
    // PowerShellでWMIを使用してドライブラベルを取得
    const { stdout } = await execPromise(
      `powershell -Command "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${driveLetter}:'} | Select-Object -ExpandProperty VolumeName"`,
      { encoding: 'utf8' }
    );
    
    return stdout.trim();
  } catch (error) {
    console.error('ドライブラベル取得エラー:', error);
    return '';
  }
}

module.exports = {
  detectCameraWithDCIM,
  detectSigmaCamera,
  getDriveLabel,
};