// ファイル操作機能のテスト
// TDD: まずテストを作成し、期待される動作を定義する

const path = require('path');
const fs = require('fs-extra');

describe('ファイル操作機能', () => {
  describe('カメラフォルダ情報取得', () => {
    test('DCIMフォルダ内のサブフォルダ一覧を取得できる', async () => {
      // 期待される動作:
      // 1. DCIMフォルダ内のディレクトリを検索
      // 2. 各フォルダ内のファイル数をカウント
      // 3. フォルダサイズを計算
      // 4. 日付形式を認識して表示用に変換
      
      const { getCameraFolders } = require('../src/utils/file-manager');
      
      const cameraPath = '/mock/camera/path';
      const result = await getCameraFolders(cameraPath);
      
      // 期待される結果: フォルダ情報の配列
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const folder = result[0];
        expect(folder).toHaveProperty('name');
        expect(folder).toHaveProperty('path');
        expect(folder).toHaveProperty('files');
        expect(folder).toHaveProperty('date');
        expect(folder).toHaveProperty('size');
        expect(typeof folder.files).toBe('number');
      }
    });

    test('日付フォルダ名を正しく解析する', async () => {
      // 期待される動作:
      // "YYMMDD_N" 形式のフォルダ名を "YYYY-MM-DD" 形式に変換
      
      const { parseFolderDate } = require('../src/utils/file-manager');
      
      const testCases = [
        { input: '241201_1', expected: '2024-12-01' },
        { input: '250101_2', expected: '2025-01-01' },
        { input: 'other_folder', expected: 'other_folder' },
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = parseFolderDate(input);
        expect(result).toBe(expected);
      });
    });

    test('ファイルサイズを人間が読みやすい形式でフォーマットする', async () => {
      // 期待される動作:
      // バイト数を KB, MB, GB 単位で表示
      
      const { formatFileSize } = require('../src/utils/file-manager');
      
      const testCases = [
        { input: 500, expected: '500 B' },
        { input: 1024, expected: '1.0 KB' },
        { input: 1024 * 1024, expected: '1.0 MB' },
        { input: 1024 * 1024 * 1024, expected: '1.0 GB' },
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = formatFileSize(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('ファイルコピー機能', () => {
    test('写真と動画を正しく分類してコピーする', async () => {
      // 期待される動作:
      // 1. ソースフォルダからファイル一覧を取得
      // 2. 拡張子で写真/動画を判定
      // 3. それぞれ指定されたフォルダにコピー
      // 4. 進行状況を報告
      
      const { copyFiles } = require('../src/utils/file-manager');
      
      const sourceFolder = '/mock/source';
      const photoDestination = '/mock/photos';
      const videoDestination = '/mock/videos';
      const folderName = 'test-folder';
      
      const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);
      
      // 期待される結果
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('copiedPhotos');
      expect(result).toHaveProperty('copiedVideos');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('photoDestPath');
      expect(result).toHaveProperty('videoDestPath');
      
      expect(typeof result.totalFiles).toBe('number');
      expect(typeof result.copiedPhotos).toBe('number');
      expect(typeof result.copiedVideos).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('ファイル拡張子による分類が正しく動作する', async () => {
      // 期待される動作:
      // 写真: .jpg, .jpeg, .dng, .raw, .tiff, .tif, .heif, .heic
      // 動画: .mov, .mp4, .avi, .mkv, .m4v
      
      const { classifyFileType } = require('../src/utils/file-manager');
      
      const photoExtensions = ['.jpg', '.jpeg', '.dng', '.raw', '.tiff', '.tif', '.heif', '.heic'];
      const videoExtensions = ['.mov', '.mp4', '.avi', '.mkv', '.m4v'];
      
      photoExtensions.forEach(ext => {
        const result = classifyFileType(`test${ext}`);
        expect(result).toBe('photo');
      });
      
      videoExtensions.forEach(ext => {
        const result = classifyFileType(`test${ext}`);
        expect(result).toBe('video');
      });
      
      // 不明な拡張子は写真として扱う
      const result = classifyFileType('test.unknown');
      expect(result).toBe('photo');
    });

    test('コピー先フォルダ名を正しく生成する', async () => {
      // 期待される動作:
      // "YYYY-MM-DD_フォルダ名/BF" 形式でフォルダを作成
      
      const { generateDestinationPath } = require('../src/utils/file-manager');
      
      const destination = '/mock/destination';
      const folderName = 'test-folder';
      
      const result = generateDestinationPath(destination, folderName);
      
      // 今日の日付が含まれることを確認
      const today = new Date().toISOString().slice(0, 10);
      expect(result).toContain(today);
      expect(result).toContain(folderName);
      expect(result).toContain('BF');
      expect(result).toMatch(/\/\d{4}-\d{2}-\d{2}_test-folder\/BF$/);
    });
  });
});