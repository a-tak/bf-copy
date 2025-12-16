// カメラ検知機能のテスト
// TDD: まずテストを作成し、期待される動作を定義する

const path = require('path');
const fs = require('fs-extra');

// テスト対象の関数を独立させるため、main.jsから関数を抽出する必要がある
// 現在は main.js に直接書かれているので、まずはモジュール化をテストで要求する

describe('カメラ検知機能', () => {
  describe('Sigma BF カメラの検知', () => {
    test('DCIMフォルダを持つドライブを検知できる', async () => {
      // 期待される動作:
      // 1. システム内のドライブを一覧取得
      // 2. 各ドライブでDCIMフォルダの存在をチェック
      // 3. DCIMフォルダが存在するドライブを返す

      const mockDrives = [
        { drive: 'C', path: 'C:\\', dcimPath: 'C:\\DCIM', label: 'System' },
        { drive: 'D', path: 'D:\\', dcimPath: 'D:\\DCIM', label: 'SIGMA BF' },
      ];

      // この関数はまだ存在しない - TDDなので先にテストを書く
      const { detectCameraWithDCIM } = require('../src/utils/camera-detector');

      const result = await detectCameraWithDCIM();

      // 期待される結果: DCIMフォルダを持つドライブが返される
      expect(result).toBeDefined();
      expect(result).toHaveProperty('drive');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('dcimPath');
      expect(result).toHaveProperty('label');
    });

    test('Sigma BFカメラを優先的に検知する', async () => {
      // 期待される動作:
      // 複数のDCIMドライブがある場合、ラベルに"sigma"を含むものを優先する

      const { detectSigmaCamera } = require('../src/utils/camera-detector');

      const result = await detectSigmaCamera();

      // Sigma BFカメラが検知された場合
      if (result) {
        expect(result.label.toLowerCase()).toContain('sigma');
      }
    });



    test('カメラが見つからない場合はnullを返す', async () => {
      // 期待される動作:
      // DCIMフォルダを持つドライブが存在しない場合はnullを返す

      const { detectSigmaCamera } = require('../src/utils/camera-detector');

      // モックでドライブが存在しない状況を作る
      jest.mock('fs-extra', () => ({
        stat: jest.fn().mockRejectedValue(new Error('Drive not found')),
        pathExists: jest.fn().mockResolvedValue(false),
      }));

      const result = await detectSigmaCamera();
      expect(result).toBeNull();
    });
  });

  describe('ドライブラベル取得', () => {
    test('Windowsでドライブラベルを正しく取得する', async () => {
      // 期待される動作:
      // PowerShellコマンドでドライブラベルを取得する

      const { getDriveLabel } = require('../src/utils/camera-detector');

      const drivePath = 'D:\\';
      const result = await getDriveLabel(drivePath);

      // 文字列が返されることを期待
      expect(typeof result).toBe('string');
    });

    test('ドライブラベル取得でエラーが発生した場合は空文字を返す', async () => {
      const { getDriveLabel } = require('../src/utils/camera-detector');

      // 存在しないドライブ
      const result = await getDriveLabel('Z:\\');

      expect(result).toBe('');
    });
  });
});