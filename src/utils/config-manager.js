// 設定管理ユーティリティ
// TDD: テストで要求された関数のスタブを作成

// この関数群はテストをパスするために実装される

async function loadConfig() {
  // テストで要求された設定読み込み機能を実装
  const fs = require('fs-extra');
  const configPath = getConfigPath();
  
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    return null;
  } catch (error) {
    console.error('設定読み込みエラー:', error);
    return null;
  }
}

async function saveConfig(config) {
  // テストで要求された設定保存機能を実装
  const fs = require('fs-extra');
  const path = require('path');
  const configPath = getConfigPath();
  
  try {
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('設定保存エラー:', error);
    return false;
  }
}

function getConfigPath() {
  // テストで要求された設定ファイルパス生成機能を実装
  const path = require('path');
  const os = require('os');
  return path.join(os.homedir(), '.sigma-bf-copy', 'config.json');
}

function validateConfig(config) {
  // テストで要求された設定検証機能を実装
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('設定オブジェクトが不正です');
    return { isValid: false, errors };
  }
  
  if (!config.photoDestination || typeof config.photoDestination !== 'string') {
    errors.push('写真コピー先が設定されていません');
  }
  
  if (!config.videoDestination || typeof config.videoDestination !== 'string') {
    errors.push('動画コピー先が設定されていません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function validatePaths(config) {
  // テストで要求されたパス検証機能を実装
  const fs = require('fs-extra');
  
  const result = {
    photoDestinationExists: false,
    videoDestinationExists: false
  };
  
  try {
    if (config.photoDestination) {
      const stats = await fs.stat(config.photoDestination);
      result.photoDestinationExists = stats.isDirectory();
    }
  } catch (error) {
    // パスが存在しない場合
  }
  
  try {
    if (config.videoDestination) {
      const stats = await fs.stat(config.videoDestination);
      result.videoDestinationExists = stats.isDirectory();
    }
  } catch (error) {
    // パスが存在しない場合
  }
  
  return result;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigPath,
  validateConfig,
  validatePaths,
};