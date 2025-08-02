const path = require('path');
const fs = require('fs');

/**
 * package.jsonからアプリケーションのバージョンを取得する
 * @returns {string} バージョン番号
 */
function getAppVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('バージョン取得エラー:', error);
    return '不明';
  }
}

module.exports = {
  getAppVersion
};