const path = require('path');
const util = require('util');
const fs = require('fs-extra');
const { exec } = require('child_process');
const { detectCameraWithDCIM, detectSigmaCamera, getDriveLabel } = require('../src/utils/camera-detector');
jest.mock('os', () => ({ platform: jest.fn(() => 'win32') }));
jest.mock('fs-extra', () => ({ stat: jest.fn(), pathExists: jest.fn() }));
jest.mock('child_process', () => {
  const exec = jest.fn();
  exec[require('util').promisify.custom] = jest.fn();
  return { exec };
});
const run = exec[util.promisify.custom];
beforeEach(() => {
  jest.resetAllMocks();
  require('os').platform.mockReturnValue('win32');
  fs.stat.mockImplementation(async drive => { if (!['D:\\', 'E:\\'].includes(drive)) throw Error('No drive'); return { isDirectory: () => true }; });
  fs.pathExists.mockResolvedValue(true);
  run.mockImplementation(async command => ({ stdout: command.includes("'E:'") ? 'SIGMA BF\n' : 'OTHER CAMERA\n' }));
});
describe('カメラ検知機能（実ドライブを使用しない）', () => {
  test('DCIMフォルダを持つドライブを検知できる', async () => {
    expect(await detectCameraWithDCIM()).toEqual({ drive:'D', path:'D:\\', dcimPath:path.join('D:\\','DCIM'), label:'OTHER CAMERA' });
  });
  test('複数のDCIMドライブからSigma BFカメラを優先する', async () => {
    expect(await detectSigmaCamera()).toMatchObject({ drive:'E', label:'SIGMA BF' });
  });
  test('カメラが見つからない場合はnullを返す', async () => {
    fs.pathExists.mockResolvedValue(false);
    expect(await detectSigmaCamera()).toBeNull();
  });
  test('Windowsでドライブラベルを取得して末尾改行を除く', async () => {
    expect(await getDriveLabel('E:\\')).toBe('SIGMA BF');
    expect(run).toHaveBeenCalledWith(expect.stringContaining("'E:'"), { encoding:'utf8' });
  });
  test('ドライブラベル取得コマンドが失敗したら空文字を返す', async () => {
    run.mockRejectedValue(new Error('WMI failure'));
    expect(await getDriveLabel('Z:\\')).toBe('');
  });
});
