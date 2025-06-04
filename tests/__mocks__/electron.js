// Electronのモックオブジェクト
module.exports = {
  app: {
    whenReady: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    quit: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      send: jest.fn(),
    },
    on: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
  },
};