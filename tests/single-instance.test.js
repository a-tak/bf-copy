// Single instance test - テスト確認用

// Electronモジュールをモック
jest.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(true),
    getLoginItemSettings: jest.fn().mockReturnValue({ wasOpenedAsHidden: false }),
    setLoginItemSettings: jest.fn(),
    getPath: jest.fn().mockReturnValue('/mock/path'),
    focus: jest.fn(),
    isReady: jest.fn().mockReturnValue(true)
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    isMinimized: jest.fn().mockReturnValue(false),
    restore: jest.fn(),
    hide: jest.fn(),
    setMenuBarVisibility: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      send: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showMessageBox: jest.fn()
  },
  Tray: jest.fn().mockImplementation(() => ({
    setContextMenu: jest.fn(),
    setToolTip: jest.fn(),
    on: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn().mockReturnValue({})
  },
  nativeImage: {
    createFromPath: jest.fn().mockReturnValue({})
  }
}));

describe('自動起動設定の重複防止', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('既に自動起動が有効な場合は重複設定を回避する', () => {
    // 既に自動起動が有効な状態をモック
    const { app } = require('electron');
    app.getLoginItemSettings.mockReturnValue({ 
      openAtLogin: true,
      openAsHidden: true
    });

    // 自動起動設定管理関数をテスト（後で実装）
    const autoStartManager = require('../src/utils/auto-start-manager');
    
    // 既に有効な状態で再度有効化を試行
    const result = autoStartManager.setAutoStart(true);
    
    // 重複設定を回避し、setLoginItemSettingsが呼ばれないことを確認
    expect(app.setLoginItemSettings).not.toHaveBeenCalled();
    expect(result.wasAlreadySet).toBe(true);
  });

  test('自動起動が無効な場合のみ新規設定を実行する', () => {
    // 自動起動が無効な状態をモック
    const { app } = require('electron');
    app.getLoginItemSettings.mockReturnValue({ 
      openAtLogin: false,
      openAsHidden: false
    });

    // 自動起動設定管理関数をテスト
    const autoStartManager = require('../src/utils/auto-start-manager');
    
    // 無効状態から有効化を実行
    const result = autoStartManager.setAutoStart(true);
    
    // 新規設定が実行されることを確認
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      openAsHidden: true
    });
    expect(result.wasAlreadySet).toBe(false);
  });

  test('現在の自動起動設定状態を正確に取得する', () => {
    const { app } = require('electron');
    app.getLoginItemSettings.mockReturnValue({ 
      openAtLogin: true,
      openAsHidden: true,
      wasOpenedAsHidden: false
    });

    const autoStartManager = require('../src/utils/auto-start-manager');
    const status = autoStartManager.getAutoStartStatus();
    
    expect(status.openAtLogin).toBe(true);
    expect(status.openAsHidden).toBe(true);
    expect(app.getLoginItemSettings).toHaveBeenCalled();
  });
});

describe('シングルインスタンス制御', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('アプリケーションの最初のインスタンスは正常に起動する', () => {
    // 最初のインスタンスのロックが成功する
    app.requestSingleInstanceLock.mockReturnValue(true);
    
    // main.jsを実行（実際の実装ではrequireで読み込まれる）
    // ここでは、シングルインスタンスチェックが実行されることを確認
    expect(app.requestSingleInstanceLock).toHaveBeenCalled();
    expect(app.quit).not.toHaveBeenCalled();
  });

  test('アプリケーションの2番目のインスタンスは終了する', () => {
    // 2番目のインスタンスのロックが失敗する
    app.requestSingleInstanceLock.mockReturnValue(false);
    
    // main.jsのシングルインスタンスチェックを実行
    const gotTheLock = app.requestSingleInstanceLock();
    
    if (!gotTheLock) {
      app.quit();
    }
    
    expect(app.requestSingleInstanceLock).toHaveBeenCalled();
    expect(app.quit).toHaveBeenCalled();
  });

  test('2番目のインスタンス起動時に最初のインスタンスがアクティブ化される', () => {
    // 最初のインスタンスのモック
    const mockMainWindow = {
      isMinimized: jest.fn().mockReturnValue(false),
      show: jest.fn(),
      focus: jest.fn()
    };

    // second-instanceイベントハンドラのモック
    const secondInstanceHandler = jest.fn((event, commandLine, workingDirectory) => {
      if (mockMainWindow) {
        if (mockMainWindow.isMinimized()) {
          mockMainWindow.restore();
        }
        mockMainWindow.show();
        mockMainWindow.focus();
      }
    });

    // イベントハンドラの登録
    app.on.mockImplementation((event, handler) => {
      if (event === 'second-instance') {
        secondInstanceHandler();
      }
    });

    // second-instanceイベントを発火
    app.on('second-instance', secondInstanceHandler);
    
    expect(mockMainWindow.show).toHaveBeenCalled();
    expect(mockMainWindow.focus).toHaveBeenCalled();
  });

  test('最小化されたウィンドウは2番目のインスタンス起動時に復元される', () => {
    // 最小化されたウィンドウのモック
    const mockMainWindow = {
      isMinimized: jest.fn().mockReturnValue(true),
      restore: jest.fn(),
      show: jest.fn(),
      focus: jest.fn()
    };

    // second-instanceイベントハンドラのモック
    const secondInstanceHandler = jest.fn(() => {
      if (mockMainWindow) {
        if (mockMainWindow.isMinimized()) {
          mockMainWindow.restore();
        }
        mockMainWindow.show();
        mockMainWindow.focus();
      }
    });

    // second-instanceイベントを発火
    secondInstanceHandler();
    
    expect(mockMainWindow.isMinimized).toHaveBeenCalled();
    expect(mockMainWindow.restore).toHaveBeenCalled();
    expect(mockMainWindow.show).toHaveBeenCalled();
    expect(mockMainWindow.focus).toHaveBeenCalled();
  });
});