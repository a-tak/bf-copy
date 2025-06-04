module.exports = {
  // テスト環境の設定
  testEnvironment: 'node',
  
  // テストファイルの検索パターン
  testMatch: [
    '**/tests/**/*.test.js',
    '**/src/**/__tests__/**/*.js'
  ],
  
  // カバレッジ収集対象
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/node_modules/**',
    '!src/**/*.test.js'
  ],
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // モジュール解決
  moduleFileExtensions: ['js', 'json'],
  
  // Node.jsモジュールのモック設定
  moduleNameMapping: {
    '^electron$': '<rootDir>/tests/__mocks__/electron.js'
  },
  
  // タイムアウト設定
  testTimeout: 30000,
  
  // 詳細出力
  verbose: true
};