const { app } = require('electron');
const { execFileSync } = require('child_process');

/**
 * 自動起動設定管理モジュール
 * Windows NSISインストーラー対応: レジストリを直接操作して確実に設定する
 */

const APP_NAME = 'BF Copy';
const WIN_REG_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run';

/**
 * Windowsレジストリに自動起動を直接登録/削除（NSISインストーラー対応）
 * @param {boolean} enabled - 有効化するかどうか
 */
function setAutoStartWindowsRegistry(enabled) {
  if (enabled) {
    const regValue = `"${process.execPath}" --hidden`;
    execFileSync('reg', ['add', WIN_REG_KEY, '/v', APP_NAME, '/t', 'REG_SZ', '/d', regValue, '/f']);
    console.log('レジストリに自動起動を登録:', regValue);
  } else {
    try {
      execFileSync('reg', ['delete', WIN_REG_KEY, '/v', APP_NAME, '/f']);
      console.log('レジストリから自動起動を削除しました');
    } catch (e) {
      // 設定が存在しない場合は無視（正常）
    }
  }
}

/**
 * Windowsレジストリから自動起動設定状態を取得
 * @returns {Object} 自動起動設定の状態
 */
function getAutoStartStatusWindowsRegistry() {
  try {
    const result = execFileSync('reg', ['query', WIN_REG_KEY, '/v', APP_NAME], { encoding: 'utf8' });
    const currentExecPathLower = process.execPath.toLowerCase();
    const openAtLogin = result.toLowerCase().includes(currentExecPathLower);
    return {
      openAtLogin,
      openAsHidden: openAtLogin,
      wasOpenedAsHidden: process.argv.includes('--hidden'),
      executableWillLaunchAtLogin: openAtLogin,
      launchItems: []
    };
  } catch (e) {
    return {
      openAtLogin: false,
      openAsHidden: false,
      wasOpenedAsHidden: process.argv.includes('--hidden'),
      executableWillLaunchAtLogin: false,
      launchItems: []
    };
  }
}

/**
 * 古い自動起動設定（Electron.exe等）をクリーンアップ
 * アプリ起動時に呼び出す。現在の実行ファイルと異なるパスが登録されている場合は削除する。
 */
function cleanupOldAutoStartSettings() {
  if (process.platform !== 'win32') return;

  try {
    const result = execFileSync('reg', ['query', WIN_REG_KEY, '/v', APP_NAME], { encoding: 'utf8' });
    const currentExecPathLower = process.execPath.toLowerCase();

    // REG_SZ の後の値を取得
    const match = result.match(/REG_SZ\s+(.+)/i);
    if (match) {
      const registeredValue = match[1].trim();
      if (!registeredValue.toLowerCase().includes(currentExecPathLower)) {
        // 異なるexeパス → 古い設定を削除
        console.log('古い自動起動設定を削除します:', registeredValue);
        execFileSync('reg', ['delete', WIN_REG_KEY, '/v', APP_NAME, '/f']);
        console.log('古い自動起動設定を削除しました（再設定が必要な場合はトレイメニューから行ってください）');
      } else if (!registeredValue.includes('--hidden')) {
        // パスは正しいが--hiddenがない → --hidden付きで再登録（旧バージョンからの移行対応）
        console.log('自動起動設定に--hiddenがないため修復します:', registeredValue);
        setAutoStartWindowsRegistry(true);
      }
    }
  } catch (e) {
    // レジストリに設定がない場合は正常
  }
}

/**
 * 現在の自動起動設定状態を取得
 * @returns {Object} 自動起動設定の状態
 */
function getAutoStartStatus() {
  try {
    // Windows + パッケージ済みアプリ: レジストリを直接確認
    if (process.platform === 'win32' && app.isPackaged) {
      return getAutoStartStatusWindowsRegistry();
    }

    // macOS / 開発環境: Electron APIを使用
    const settings = app.getLoginItemSettings();
    return {
      openAtLogin: settings.openAtLogin || false,
      openAsHidden: settings.openAsHidden || false,
      wasOpenedAsHidden: settings.wasOpenedAsHidden || false,
      executableWillLaunchAtLogin: settings.executableWillLaunchAtLogin || false,
      launchItems: settings.launchItems || []
    };
  } catch (error) {
    console.error('自動起動設定の取得エラー:', error);
    return {
      openAtLogin: false,
      openAsHidden: false,
      wasOpenedAsHidden: false,
      executableWillLaunchAtLogin: false,
      launchItems: []
    };
  }
}

/**
 * 自動起動の設定を行う（重複設定を防止）
 * @param {boolean} enabled - 自動起動を有効化するかどうか
 * @returns {Object} 設定結果
 */
function setAutoStart(enabled) {
  try {
    const currentStatus = getAutoStartStatus();

    // 既に同じ設定が有効な場合は重複設定を回避
    if (enabled && currentStatus.openAtLogin) {
      console.log('自動起動は既に有効になっています - 重複設定を回避');
      return {
        success: true,
        wasAlreadySet: true,
        message: '自動起動は既に有効になっています'
      };
    }

    if (!enabled && !currentStatus.openAtLogin) {
      console.log('自動起動は既に無効になっています - 重複設定を回避');
      return {
        success: true,
        wasAlreadySet: true,
        message: '自動起動は既に無効になっています'
      };
    }

    // Windows + パッケージ済みアプリ: レジストリを直接操作（NSISインストーラー対応）
    if (process.platform === 'win32' && app.isPackaged) {
      setAutoStartWindowsRegistry(enabled);
    } else {
      // macOS / 開発環境: Electron APIを使用
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: enabled, // macOS用
        args: enabled ? ['--hidden'] : [] // 開発環境用
      });
    }

    const newStatus = getAutoStartStatus();
    console.log('設定後の状態:', newStatus);

    return {
      success: true,
      wasAlreadySet: false,
      message: enabled ? '自動起動を有効にしました' : '自動起動を無効にしました',
      newStatus
    };

  } catch (error) {
    console.error('自動起動設定エラー:', error);
    return {
      success: false,
      wasAlreadySet: false,
      message: `自動起動設定に失敗しました: ${error.message}`,
      error
    };
  }
}

/**
 * 自動起動設定の詳細情報をログ出力
 * デバッグ用に詳細な情報を出力
 */
function logAutoStartDetails() {
  try {
    const status = getAutoStartStatus();
    console.log('=== 自動起動設定詳細 ===');
    console.log('platform:', process.platform, '/ isPackaged:', app.isPackaged);
    console.log('openAtLogin:', status.openAtLogin);
    console.log('openAsHidden:', status.openAsHidden);
    console.log('wasOpenedAsHidden:', status.wasOpenedAsHidden);
    console.log('executableWillLaunchAtLogin:', status.executableWillLaunchAtLogin);
    console.log('launchItems:', status.launchItems);
    console.log('========================');
  } catch (error) {
    console.error('自動起動詳細情報の取得エラー:', error);
  }
}

module.exports = {
  getAutoStartStatus,
  setAutoStart,
  cleanupOldAutoStartSettings,
  logAutoStartDetails
};
