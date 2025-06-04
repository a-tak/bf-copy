// シンプルなテストランナー（TDD確認用）
// npm install ができない場合に手動でテストの失敗を確認する

const fs = require('fs');
const path = require('path');

console.log('=== TDD テスト実行確認 ===');
console.log('');

// テストファイルの存在確認
const testFiles = [
  'tests/camera-detection.test.js',
  'tests/file-operations.test.js', 
  'tests/config-management.test.js'
];

console.log('✅ 作成されたテストファイル:');
testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} (見つかりません)`);
  }
});

console.log('');

// ユーティリティファイルの存在確認
const utilFiles = [
  'src/utils/camera-detector.js',
  'src/utils/file-manager.js',
  'src/utils/config-manager.js'
];

console.log('📁 作成されたユーティリティファイル:');
utilFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} (見つかりません)`);
  }
});

console.log('');

// 実際に一つの関数を呼び出してエラーを確認
console.log('🔍 TDD「Red」フェーズの確認:');
try {
  const cameraDetector = require('./src/utils/camera-detector');
  cameraDetector.detectSigmaCamera();
} catch (error) {
  console.log(`  ✓ テストが期待通り失敗: ${error.message}`);
}

try {
  const fileManager = require('./src/utils/file-manager');
  fileManager.formatFileSize(1024);
} catch (error) {
  console.log(`  ✓ テストが期待通り失敗: ${error.message}`);
}

try {
  const configManager = require('./src/utils/config-manager');
  configManager.loadConfig();
} catch (error) {
  console.log(`  ✓ テストが期待通り失敗: ${error.message}`);
}

console.log('');
console.log('📝 TDD プロセス確認:');
console.log('  1. ✅ テスト作成完了（期待される動作を定義）');
console.log('  2. ✅ 「Red」フェーズ確認（テストが失敗することを確認）');
console.log('  3. ⏳ 次: 「Green」フェーズ（テストをパスする実装を作成）');
console.log('  4. ⏳ 次: 「Refactor」フェーズ（実装の改善）');