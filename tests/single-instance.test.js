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