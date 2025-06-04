// Jest セットアップファイル
// テスト実行前に必要な設定を行う

// console.logの出力を制御
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// テスト用のグローバル設定
global.window = {};
global.document = {};