const { app } = require('electron');

/**
 * 自動起動設定管理モジュール
 * Windows起動時の重複起動問題を防止するため、設定状態を確認してから設定を実行
 */

/**
 * 現在の自動起動設定状態を取得
 * @returns {Object} 自動起動設定の状態
 */
function getAutoStartStatus() {
  try {
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
    if (enabled && currentStatus.openAtLogin && currentStatus.openAsHidden) {
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
    
    // 新規設定を実行
    const settings = {
      openAtLogin: enabled,
      openAsHidden: enabled // 自動起動時は非表示で開始
    };
    
    console.log('自動起動設定を更新:', settings);
    app.setLoginItemSettings(settings);
    
    // 設定後の状態を確認
    const newStatus = getAutoStartStatus();
    console.log('設定後の状態:', newStatus);
    
    return {
      success: true,
      wasAlreadySet: false,
      message: enabled ? '自動起動を有効にしました' : '自動起動を無効にしました',
      newStatus: newStatus
    };
    
  } catch (error) {
    console.error('自動起動設定エラー:', error);
    return {
      success: false,
      wasAlreadySet: false,
      message: `自動起動設定に失敗しました: ${error.message}`,
      error: error
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
  logAutoStartDetails
};