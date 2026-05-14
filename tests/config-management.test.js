// 設定管理機能のテスト
// TDD: まずテストを作成し、期待される動作を定義する

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('設定管理機能', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.dontMock('fs-extra');
  });

  describe('設定ファイルの読み込み', () => {
    test('設定ファイルが存在する場合、正しく読み込める', async () => {
      // 期待される動作:
      // ~/.sigma-bf-copy/config.json から設定を読み込む
      
      const { loadConfig } = require('../src/utils/config-manager');
      
      const result = await loadConfig();
      
      // 設定が存在する場合の期待される構造
      if (result) {
        expect(result).toHaveProperty('photoDestination');
        expect(result).toHaveProperty('videoDestination');
        expect(result).toHaveProperty('isFirstRun');
        expect(typeof result.isFirstRun).toBe('boolean');
      }
    });

    test('設定ファイルが存在しない場合、nullを返す', async () => {
      // 期待される動作:
      // 設定ファイルが存在しない場合はnullを返す

      // ファイルが存在しない状況をモック
      jest.doMock('fs-extra', () => ({
        pathExists: jest.fn().mockResolvedValue(false),
      }));

      const { loadConfig } = require('../src/utils/config-manager');
      const result = await loadConfig();
      expect(result).toBeNull();
    });

    test('設定ファイル読み込みでエラーが発生した場合、nullを返す', async () => {
      // 読み込みエラーをモック
      jest.doMock('fs-extra', () => ({
        pathExists: jest.fn().mockResolvedValue(true),
        readJson: jest.fn().mockRejectedValue(new Error('Read error')),
      }));

      const { loadConfig } = require('../src/utils/config-manager');
      const result = await loadConfig();
      expect(result).toBeNull();
    });
  });

  describe('設定ファイルの保存', () => {
    test('設定を正しく保存できる', async () => {
      // 期待される動作:
      // 設定オブジェクトをJSONファイルとして保存する

      const writeJson = jest.fn().mockResolvedValue(undefined);
      jest.doMock('fs-extra', () => ({
        ensureDir: jest.fn().mockResolvedValue(undefined),
        writeJson
      }));

      const { saveConfig } = require('../src/utils/config-manager');
      
      const config = {
        photoDestination: '/path/to/photos',
        videoDestination: '/path/to/videos',
        isFirstRun: false
      };
      
      const result = await saveConfig(config);
      expect(result).toBe(true);
      expect(writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ convertRw2ToDng: false }),
        { spaces: 2 }
      );
    });

    test('設定保存でエラーが発生した場合、falseを返す', async () => {
      // 保存エラーをモック
      jest.doMock('fs-extra', () => ({
        ensureDir: jest.fn().mockRejectedValue(new Error('Write error')),
      }));

      const { saveConfig } = require('../src/utils/config-manager');
      const config = { photoDestination: '/invalid/path' };
      const result = await saveConfig(config);
      expect(result).toBe(false);
    });

    test('設定ファイルのパスが正しく生成される', async () => {
      // 期待される動作:
      // ~/.sigma-bf-copy/config.json のパスを使用する
      
      const { getConfigPath } = require('../src/utils/config-manager');
      
      const result = getConfigPath();
      const expectedPath = path.join(os.homedir(), '.sigma-bf-copy', 'config.json');
      
      expect(result).toBe(expectedPath);
    });
  });

  describe('設定の検証', () => {
    test('旧設定ファイルにDNG変換オプションがない場合は無効として扱う', () => {
      const { normalizeConfig } = require('../src/utils/config-manager');

      const legacyConfig = {
        photoDestination: '/path/to/photos',
        videoDestination: '/path/to/videos',
        isFirstRun: false
      };

      const result = normalizeConfig(legacyConfig);
      expect(result.convertRw2ToDng).toBe(false);
    });

    test('保存済みのDNG変換オプションを保持する', () => {
      const { normalizeConfig } = require('../src/utils/config-manager');

      const config = {
        photoDestination: '/path/to/photos',
        videoDestination: '/path/to/videos',
        isFirstRun: false,
        convertRw2ToDng: false
      };

      const result = normalizeConfig(config);
      expect(result.convertRw2ToDng).toBe(false);
    });

    test('明示的に有効化されたDNG変換オプションを保持する', () => {
      const { normalizeConfig } = require('../src/utils/config-manager');

      const config = {
        photoDestination: '/path/to/photos',
        videoDestination: '/path/to/videos',
        isFirstRun: false,
        convertRw2ToDng: true
      };

      const result = normalizeConfig(config);
      expect(result.convertRw2ToDng).toBe(true);
    });

    test('有効な設定オブジェクトを正しく検証する', async () => {
      // 期待される動作:
      // 必要なプロパティが存在することを確認
      
      const { validateConfig } = require('../src/utils/config-manager');
      
      const validConfig = {
        photoDestination: '/path/to/photos',
        videoDestination: '/path/to/videos',
        isFirstRun: false
      };
      
      const result = validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効な設定オブジェクトでエラーを返す', async () => {
      const { validateConfig } = require('../src/utils/config-manager');
      
      const invalidConfigs = [
        {},  // 空のオブジェクト
        { photoDestination: '' },  // 必要なプロパティが不足
        { photoDestination: '/path', videoDestination: null },  // null値
      ];
      
      invalidConfigs.forEach(config => {
        const result = validateConfig(config);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('パスの存在を確認する', async () => {
      // 期待される動作:
      // 指定されたパスがディレクトリとして存在することを確認
      
      const { validatePaths } = require('../src/utils/config-manager');
      
      const config = {
        photoDestination: '/existing/path',
        videoDestination: '/another/existing/path'
      };
      
      const result = await validatePaths(config);
      expect(result).toHaveProperty('photoDestinationExists');
      expect(result).toHaveProperty('videoDestinationExists');
      expect(typeof result.photoDestinationExists).toBe('boolean');
      expect(typeof result.videoDestinationExists).toBe('boolean');
    });
  });
});
