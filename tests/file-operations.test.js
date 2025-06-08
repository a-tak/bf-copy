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

    test('対象ファイルがない場合はフォルダを作成しない', async () => {
      // 期待される動作:
      // ソースフォルダに写真・動画がない場合、コピー先フォルダを作成しない
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // 空のソースフォルダを作成
        await fs.ensureDir(sourceFolder);
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, 'empty-folder');
        
        // 期待される結果
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(0);
        expect(result.copiedPhotos).toBe(0);
        expect(result.copiedVideos).toBe(0);
        
        // フォルダが作成されていないことを確認
        expect(await fs.pathExists(result.photoDestPath)).toBe(false);
        expect(await fs.pathExists(result.videoDestPath)).toBe(false);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('写真のみ存在する場合は写真フォルダのみ作成する', async () => {
      // 期待される動作:
      // ソースフォルダに写真のみある場合、写真フォルダのみ作成し動画フォルダは作成しない
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // ソースフォルダに写真ファイルのみを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.jpg'), 'test photo content');
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, 'photo-only');
        
        // 期待される結果
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.copiedPhotos).toBe(1);
        expect(result.copiedVideos).toBe(0);
        
        // 写真フォルダのみ作成され、動画フォルダは作成されていないことを確認
        expect(await fs.pathExists(result.photoDestPath)).toBe(true);
        expect(await fs.pathExists(result.videoDestPath)).toBe(false);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('動画のみ存在する場合は動画フォルダのみ作成する', async () => {
      // 期待される動作:
      // ソースフォルダに動画のみある場合、動画フォルダのみ作成し写真フォルダは作成しない
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // ソースフォルダに動画ファイルのみを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.mp4'), 'test video content');
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, 'video-only');
        
        // 期待される結果
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.copiedPhotos).toBe(0);
        expect(result.copiedVideos).toBe(1);
        
        // 動画フォルダのみ作成され、写真フォルダは作成されていないことを確認
        expect(await fs.pathExists(result.photoDestPath)).toBe(false);
        expect(await fs.pathExists(result.videoDestPath)).toBe(true);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });

  describe('上書禁止機能', () => {
    test('写真フォルダが既に存在する場合はコピーを禁止する', async () => {
      // 期待される動作:
      // 1. コピー先の写真フォルダが既に存在することを検知
      // 2. コピー処理を中止し、エラーメッセージを返す
      // 3. 既存フォルダに影響を与えない
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'existing-folder';
      
      try {
        // ソースフォルダに写真ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.jpg'), 'test photo content');
        
        // コピー先に既存フォルダを作成
        const today = new Date().toISOString().slice(0, 10);
        const existingPhotoPath = path.join(photoDestination, `${today}_${folderName}`, 'BF');
        await fs.ensureDir(existingPhotoPath);
        await fs.writeFile(path.join(existingPhotoPath, 'existing.txt'), 'existing content');
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);
        
        // 期待される結果: コピーが失敗する
        expect(result.success).toBe(false);
        expect(result.message).toContain('フォルダが既に存在します');
        expect(result.overwritePrevented).toBe(true);
        expect(result.conflictPath).toBe(existingPhotoPath);
        
        // 既存ファイルが保護されていることを確認
        const existingFile = path.join(existingPhotoPath, 'existing.txt');
        expect(await fs.pathExists(existingFile)).toBe(true);
        const content = await fs.readFile(existingFile, 'utf8');
        expect(content).toBe('existing content');
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('動画フォルダが既に存在する場合はコピーを禁止する', async () => {
      // 期待される動作:
      // 1. コピー先の動画フォルダが既に存在することを検知
      // 2. コピー処理を中止し、エラーメッセージを返す
      // 3. 既存フォルダに影響を与えない
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'existing-video-folder';
      
      try {
        // ソースフォルダに動画ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.mp4'), 'test video content');
        
        // コピー先に既存フォルダを作成
        const today = new Date().toISOString().slice(0, 10);
        const existingVideoPath = path.join(videoDestination, `${today}_${folderName}`, 'BF');
        await fs.ensureDir(existingVideoPath);
        await fs.writeFile(path.join(existingVideoPath, 'existing.txt'), 'existing video content');
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);
        
        // 期待される結果: コピーが失敗する
        expect(result.success).toBe(false);
        expect(result.message).toContain('フォルダが既に存在します');
        expect(result.overwritePrevented).toBe(true);
        expect(result.conflictPath).toBe(existingVideoPath);
        
        // 既存ファイルが保護されていることを確認
        const existingFile = path.join(existingVideoPath, 'existing.txt');
        expect(await fs.pathExists(existingFile)).toBe(true);
        const content = await fs.readFile(existingFile, 'utf8');
        expect(content).toBe('existing video content');
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('写真と動画の両方のフォルダが既に存在する場合はコピーを禁止する', async () => {
      // 期待される動作:
      // 1. 写真・動画両方のコピー先フォルダが既に存在することを検知
      // 2. コピー処理を中止し、エラーメッセージを返す
      // 3. 最初に見つかった競合フォルダをレポートする
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'mixed-existing-folder';
      
      try {
        // ソースフォルダに写真と動画ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.jpg'), 'test photo content');
        await fs.writeFile(path.join(sourceFolder, 'test.mp4'), 'test video content');
        
        // コピー先に既存フォルダを両方作成
        const today = new Date().toISOString().slice(0, 10);
        const existingPhotoPath = path.join(photoDestination, `${today}_${folderName}`, 'BF');
        const existingVideoPath = path.join(videoDestination, `${today}_${folderName}`, 'BF');
        
        await fs.ensureDir(existingPhotoPath);
        await fs.ensureDir(existingVideoPath);
        await fs.writeFile(path.join(existingPhotoPath, 'existing_photo.txt'), 'existing photo content');
        await fs.writeFile(path.join(existingVideoPath, 'existing_video.txt'), 'existing video content');
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);
        
        // 期待される結果: コピーが失敗する
        expect(result.success).toBe(false);
        expect(result.message).toContain('フォルダが既に存在します');
        expect(result.overwritePrevented).toBe(true);
        expect(result.conflictPath).toBeTruthy();
        
        // 既存ファイルが両方とも保護されていることを確認
        const existingPhotoFile = path.join(existingPhotoPath, 'existing_photo.txt');
        const existingVideoFile = path.join(existingVideoPath, 'existing_video.txt');
        
        expect(await fs.pathExists(existingPhotoFile)).toBe(true);
        expect(await fs.pathExists(existingVideoFile)).toBe(true);
        
        const photoContent = await fs.readFile(existingPhotoFile, 'utf8');
        const videoContent = await fs.readFile(existingVideoFile, 'utf8');
        expect(photoContent).toBe('existing photo content');
        expect(videoContent).toBe('existing video content');
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('フォルダが存在しない場合は正常にコピーを実行する', async () => {
      // 期待される動作:
      // 1. コピー先フォルダが存在しないことを確認
      // 2. 通常通りフォルダを作成してファイルをコピーする
      // 3. 成功結果を返す
      
      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'new-folder';
      
      try {
        // ソースフォルダに写真と動画ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.jpg'), 'test photo content');
        await fs.writeFile(path.join(sourceFolder, 'test.mp4'), 'test video content');
        
        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);
        
        // 期待される結果: コピーが成功する
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(2);
        expect(result.copiedPhotos).toBe(1);
        expect(result.copiedVideos).toBe(1);
        expect(result.overwritePrevented).toBeUndefined();
        
        // ファイルが正しくコピーされていることを確認
        expect(await fs.pathExists(result.photoDestPath)).toBe(true);
        expect(await fs.pathExists(result.videoDestPath)).toBe(true);
        
        const copiedPhoto = path.join(result.photoDestPath, 'test.jpg');
        const copiedVideo = path.join(result.videoDestPath, 'test.mp4');
        
        expect(await fs.pathExists(copiedPhoto)).toBe(true);
        expect(await fs.pathExists(copiedVideo)).toBe(true);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });
});