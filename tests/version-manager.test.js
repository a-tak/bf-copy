const path = require('path');
const fs = require('fs');

describe('Version Manager', () => {
  test('package.jsonからバージョンを正しく取得する', () => {
    // package.jsonのパスを取得
    const packageJsonPath = path.join(__dirname, '../package.json');
    
    // package.jsonが存在することを確認
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    // package.jsonを読み込み
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // バージョンが存在し、正しい形式であることを確認
    expect(packageJson.version).toBeDefined();
    expect(typeof packageJson.version).toBe('string');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    
    // 現在のバージョンが1.0.6であることを確認
    expect(packageJson.version).toBe('1.0.6');
  });

  test('バージョン取得関数が正しく動作する', () => {
    // まだ実装されていないgetAppVersion関数をテスト
    // この段階では関数が存在しないためエラーになる（Red フェーズ）
    const { getAppVersion } = require('../src/utils/version-manager');
    
    const version = getAppVersion();
    
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).toBe('1.0.6');
  });
});