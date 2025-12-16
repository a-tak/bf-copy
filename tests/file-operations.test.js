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
        { input: 'other_folder', expected: null },
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
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'test-folder';

      try {
        // ソースフォルダに写真と動画ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.jpg'), 'test photo content');
        await fs.writeFile(path.join(sourceFolder, 'test.mp4'), 'test video content');

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

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
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



    test('コピー先フォルダ名を正しく生成する（デフォルト）', async () => {
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
      // 日付パターンとフォルダ名が含まれていることを確認（パス区切り文字に依存しない）
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}_test-folder/);
    });

    test('指定されたサブフォルダ名（GH7等）を使用してコピー先フォルダ名を生成する', async () => {
      // 期待される動作:
      // "YYYY-MM-DD_フォルダ名/GH7" 形式でフォルダを作成

      const { generateDestinationPath } = require('../src/utils/file-manager');
      const path = require('path');

      const destination = '/mock/destination';
      const folderName = 'test-folder';
      const sourceDate = '2025-05-18';
      const subFolderName = 'GH7';

      const result = generateDestinationPath(destination, folderName, sourceDate, subFolderName);
      const expected = path.join(destination, '2025-05-18_test-folder', 'GH7');

      expect(result).toBe(expected);
      expect(result).toContain(subFolderName);
      expect(result).not.toContain('BF');
    });

    test('元フォルダの日付を使用してコピー先フォルダ名を生成する', async () => {
      // 期待される動作:
      // カメラフォルダの日付（250518_0 → 2025-05-18）を使用して
      // "2025-05-18_フォルダ名/BF" 形式でフォルダを作成

      const { generateDestinationPath } = require('../src/utils/file-manager');
      const path = require('path');

      const destination = '/mock/destination';
      const folderName = 'test-folder';
      const sourceDate = '2025-05-18'; // 元フォルダから抽出された日付

      const result = generateDestinationPath(destination, folderName, sourceDate);
      const expected = path.join(destination, '2025-05-18_test-folder', 'BF');

      expect(result).toBe(expected);
      expect(result).toContain(sourceDate);
      expect(result).toContain(folderName);
      expect(result).toContain('BF');
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

    test('カメラフォルダの日付を使用してコピー先フォルダを作成する', async () => {
      // 期待される動作:
      // 1. ソースフォルダのパス末尾から「250518_0」のようなフォルダ名を取得
      // 2. parseFolderDateで「2025-05-18」に変換
      // 3. コピー先フォルダ名を「2025-05-18_ユーザー入力名」で作成

      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-test-'));
      const cameraRootPath = path.join(testDir, 'camera');
      const sourceFolder = path.join(cameraRootPath, 'DCIM', '250518_0'); // カメラフォルダの形式
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'camera-test';

      try {
        // ソースフォルダに写真ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'test.jpg'), 'test photo content');

        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);

        // 期待される結果
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.copiedPhotos).toBe(1);
        expect(result.copiedVideos).toBe(0);

        // コピー先フォルダが元のカメラフォルダの日付を使用していることを確認
        expect(result.photoDestPath).toContain('2025-05-18_camera-test');
        expect(result.photoDestPath).not.toContain(new Date().toISOString().slice(0, 10)); // 今日の日付は使用されない

        // フォルダが正しく作成されていることを確認
        expect(await fs.pathExists(result.photoDestPath)).toBe(true);
        expect(await fs.pathExists(result.videoDestPath)).toBe(false);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });

  describe('上書禁止機能（レガシー互換性テスト）', () => {
    test('写真フォルダが既に存在する場合でも差分コピーが成功する', async () => {
      // 期待される動作（新しい仕様）:
      // 1. コピー先の写真フォルダが既に存在することを検知
      // 2. 既存ファイルはスキップし、新規ファイルのみコピー
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

        // 期待される結果: 差分コピーが成功する
        expect(result.success).toBe(true);
        expect(result.alreadyExists).toBe(true);
        expect(result.copiedPhotos).toBe(1); // test.jpgがコピーされる
        expect(result.skippedPhotos).toBe(0); // 同名ファイルなし

        // 既存ファイルが保護されていることを確認
        const existingFile = path.join(existingPhotoPath, 'existing.txt');
        expect(await fs.pathExists(existingFile)).toBe(true);
        const content = await fs.readFile(existingFile, 'utf8');
        expect(content).toBe('existing content');

        // 新しいファイルがコピーされていることを確認
        const newFile = path.join(existingPhotoPath, 'test.jpg');
        expect(await fs.pathExists(newFile)).toBe(true);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('動画フォルダが既に存在する場合でも差分コピーが成功する', async () => {
      // 期待される動作（新しい仕様）:
      // 1. コピー先の動画フォルダが既に存在することを検知
      // 2. 既存ファイルはスキップし、新規ファイルのみコピー
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

        // 期待される結果: 差分コピーが成功する
        expect(result.success).toBe(true);
        expect(result.alreadyExists).toBe(true);
        expect(result.copiedVideos).toBe(1); // test.mp4がコピーされる
        expect(result.skippedVideos).toBe(0); // 同名ファイルなし

        // 既存ファイルが保護されていることを確認
        const existingFile = path.join(existingVideoPath, 'existing.txt');
        expect(await fs.pathExists(existingFile)).toBe(true);
        const content = await fs.readFile(existingFile, 'utf8');
        expect(content).toBe('existing video content');

        // 新しいファイルがコピーされていることを確認
        const newFile = path.join(existingVideoPath, 'test.mp4');
        expect(await fs.pathExists(newFile)).toBe(true);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('写真と動画の両方のフォルダが既に存在する場合でも差分コピーが成功する', async () => {
      // 期待される動作（新しい仕様）:
      // 1. 写真・動画両方のコピー先フォルダが既に存在することを検知
      // 2. 既存ファイルはスキップし、新規ファイルのみコピー
      // 3. 既存ファイルに影響を与えない

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

        // 期待される結果: 差分コピーが成功する
        expect(result.success).toBe(true);
        expect(result.alreadyExists).toBe(true);
        expect(result.copiedPhotos).toBe(1); // test.jpgがコピーされる
        expect(result.copiedVideos).toBe(1); // test.mp4がコピーされる
        expect(result.skippedPhotos).toBe(0); // 同名ファイルなし
        expect(result.skippedVideos).toBe(0); // 同名ファイルなし

        // 既存ファイルが両方とも保護されていることを確認
        const existingPhotoFile = path.join(existingPhotoPath, 'existing_photo.txt');
        const existingVideoFile = path.join(existingVideoPath, 'existing_video.txt');

        expect(await fs.pathExists(existingPhotoFile)).toBe(true);
        expect(await fs.pathExists(existingVideoFile)).toBe(true);

        const photoContent = await fs.readFile(existingPhotoFile, 'utf8');
        const videoContent = await fs.readFile(existingVideoFile, 'utf8');
        expect(photoContent).toBe('existing photo content');
        expect(videoContent).toBe('existing video content');

        // 新しいファイルがコピーされていることを確認
        const newPhotoFile = path.join(existingPhotoPath, 'test.jpg');
        const newVideoFile = path.join(existingVideoPath, 'test.mp4');
        expect(await fs.pathExists(newPhotoFile)).toBe(true);
        expect(await fs.pathExists(newVideoFile)).toBe(true);

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

  describe('差分コピー機能', () => {
    test('既存フォルダに一部ファイルが存在する場合、未コピーファイルのみをコピーする', async () => {
      // 期待される動作:
      // 1. 既存フォルダ内のファイル一覧を取得
      // 2. ソースファイルとの差分を計算
      // 3. 未コピーファイルのみをコピー
      // 4. 結果にスキップしたファイル数を含める

      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-incremental-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'incremental-test';

      try {
        // ソースフォルダに3つの写真ファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'photo1 content');
        await fs.writeFile(path.join(sourceFolder, 'photo2.jpg'), 'photo2 content');
        await fs.writeFile(path.join(sourceFolder, 'photo3.jpg'), 'photo3 content');

        // 既存フォルダにphoto1.jpgのみ事前に配置
        const today = new Date().toISOString().slice(0, 10);
        const existingPhotoPath = path.join(photoDestination, `${today}_${folderName}`, 'BF');
        await fs.ensureDir(existingPhotoPath);
        await fs.writeFile(path.join(existingPhotoPath, 'photo1.jpg'), 'existing photo1 content');

        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);

        // 期待される結果: 差分コピーが成功する
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(3);
        expect(result.copiedPhotos).toBe(2); // photo2.jpg, photo3.jpgのみコピー
        expect(result.copiedVideos).toBe(0);
        expect(result.skippedPhotos).toBe(1); // photo1.jpgはスキップ
        expect(result.skippedVideos).toBe(0);
        expect(result.alreadyExists).toBe(true); // フォルダが既存

        // 新しいファイルがコピーされていることを確認
        expect(await fs.pathExists(path.join(existingPhotoPath, 'photo2.jpg'))).toBe(true);
        expect(await fs.pathExists(path.join(existingPhotoPath, 'photo3.jpg'))).toBe(true);

        // 既存ファイルが保護されていることを確認
        const existingContent = await fs.readFile(path.join(existingPhotoPath, 'photo1.jpg'), 'utf8');
        expect(existingContent).toBe('existing photo1 content'); // 元の内容が保持

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('既存フォルダにすべてのファイルが存在する場合、何もコピーしない', async () => {
      // 期待される動作:
      // 1. すべてのファイルが既存であることを検知
      // 2. コピー処理をスキップ
      // 3. 適切な結果を返す

      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-all-exists-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'all-exists-test';

      try {
        // ソースフォルダに2つのファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'photo1 content');
        await fs.writeFile(path.join(sourceFolder, 'video1.mp4'), 'video1 content');

        // 既存フォルダに同じファイルを事前に配置
        const today = new Date().toISOString().slice(0, 10);
        const existingPhotoPath = path.join(photoDestination, `${today}_${folderName}`, 'BF');
        const existingVideoPath = path.join(videoDestination, `${today}_${folderName}`, 'BF');
        await fs.ensureDir(existingPhotoPath);
        await fs.ensureDir(existingVideoPath);
        await fs.writeFile(path.join(existingPhotoPath, 'photo1.jpg'), 'existing photo1 content');
        await fs.writeFile(path.join(existingVideoPath, 'video1.mp4'), 'existing video1 content');

        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);

        // 期待される結果: すべてスキップされる
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(2);
        expect(result.copiedPhotos).toBe(0);
        expect(result.copiedVideos).toBe(0);
        expect(result.skippedPhotos).toBe(1);
        expect(result.skippedVideos).toBe(1);
        expect(result.alreadyExists).toBe(true);

        // 既存ファイルが保護されていることを確認
        const existingPhotoContent = await fs.readFile(path.join(existingPhotoPath, 'photo1.jpg'), 'utf8');
        const existingVideoContent = await fs.readFile(path.join(existingVideoPath, 'video1.mp4'), 'utf8');
        expect(existingPhotoContent).toBe('existing photo1 content');
        expect(existingVideoContent).toBe('existing video1 content');

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('混在パターン（写真は一部既存、動画は新規）での差分コピー', async () => {
      // 期待される動作:
      // 1. 写真と動画の差分をそれぞれ計算
      // 2. 未コピーファイルのみを適切なフォルダにコピー
      // 3. 詳細な結果を返す

      const { copyFiles } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-mixed-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      const folderName = 'mixed-test';

      try {
        // ソースフォルダに写真2つ、動画2つを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'photo1 content');
        await fs.writeFile(path.join(sourceFolder, 'photo2.jpg'), 'photo2 content');
        await fs.writeFile(path.join(sourceFolder, 'video1.mp4'), 'video1 content');
        await fs.writeFile(path.join(sourceFolder, 'video2.mp4'), 'video2 content');

        // 既存フォルダにphoto1.jpgのみ事前に配置（動画フォルダは存在しない）
        const today = new Date().toISOString().slice(0, 10);
        const existingPhotoPath = path.join(photoDestination, `${today}_${folderName}`, 'BF');
        await fs.ensureDir(existingPhotoPath);
        await fs.writeFile(path.join(existingPhotoPath, 'photo1.jpg'), 'existing photo1 content');

        const result = await copyFiles(sourceFolder, photoDestination, videoDestination, folderName);

        // 期待される結果
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(4);
        expect(result.copiedPhotos).toBe(1); // photo2.jpgのみコピー
        expect(result.copiedVideos).toBe(2); // video1.mp4, video2.mp4をコピー
        expect(result.skippedPhotos).toBe(1); // photo1.jpgはスキップ
        expect(result.skippedVideos).toBe(0); // 動画は全てコピー
        expect(result.alreadyExists).toBe(true);

        // 新しいファイルがコピーされていることを確認
        expect(await fs.pathExists(path.join(existingPhotoPath, 'photo2.jpg'))).toBe(true);
        const videoPath = path.join(videoDestination, `${today}_${folderName}`, 'BF');
        expect(await fs.pathExists(path.join(videoPath, 'video1.mp4'))).toBe(true);
        expect(await fs.pathExists(path.join(videoPath, 'video2.mp4'))).toBe(true);

        // 既存ファイルが保護されていることを確認
        const existingContent = await fs.readFile(path.join(existingPhotoPath, 'photo1.jpg'), 'utf8');
        expect(existingContent).toBe('existing photo1 content');

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });
});