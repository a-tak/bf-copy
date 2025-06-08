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

  describe('ファイル上書き防止機能', () => {
    test('既存ファイルが存在する場合を検知する', async () => {
      // 期待される動作:
      // 1. コピー先に同名ファイルが既に存在するかチェック
      // 2. 存在する場合は衝突情報を返す
      // 3. 存在しない場合は空の配列を返す
      
      const { checkFileConflicts } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-conflict-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // ソースフォルダにテストファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'test photo');
        await fs.writeFile(path.join(sourceFolder, 'video1.mp4'), 'test video');
        
        // コピー先に既存ファイルを作成（衝突するファイル）
        const today = new Date().toISOString().slice(0, 10);
        const photoDestPath = path.join(photoDestination, `${today}_test-folder`, 'BF');
        const videoDestPath = path.join(videoDestination, `${today}_test-folder`, 'BF');
        
        await fs.ensureDir(photoDestPath);
        await fs.ensureDir(videoDestPath);
        await fs.writeFile(path.join(photoDestPath, 'photo1.jpg'), 'existing photo');
        await fs.writeFile(path.join(videoDestPath, 'video1.mp4'), 'existing video');
        
        const conflicts = await checkFileConflicts(sourceFolder, photoDestination, videoDestination, 'test-folder');
        
        // 期待される結果
        expect(Array.isArray(conflicts)).toBe(true);
        expect(conflicts.length).toBe(2);
        
        const photoConflict = conflicts.find(c => c.fileName === 'photo1.jpg');
        const videoConflict = conflicts.find(c => c.fileName === 'video1.mp4');
        
        expect(photoConflict).toBeDefined();
        expect(photoConflict.fileType).toBe('photo');
        expect(photoConflict.existingPath).toBe(path.join(photoDestPath, 'photo1.jpg'));
        
        expect(videoConflict).toBeDefined();
        expect(videoConflict.fileType).toBe('video');
        expect(videoConflict.existingPath).toBe(path.join(videoDestPath, 'video1.mp4'));
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('既存ファイルが存在しない場合は空の配列を返す', async () => {
      // 期待される動作:
      // コピー先に衝突するファイルがない場合は空の配列を返す
      
      const { checkFileConflicts } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-no-conflict-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // ソースフォルダにテストファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'test photo');
        await fs.writeFile(path.join(sourceFolder, 'video1.mp4'), 'test video');
        
        // コピー先フォルダは存在しない（新規作成）
        
        const conflicts = await checkFileConflicts(sourceFolder, photoDestination, videoDestination, 'new-folder');
        
        // 期待される結果
        expect(Array.isArray(conflicts)).toBe(true);
        expect(conflicts.length).toBe(0);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('既存フォルダが存在する場合を検知する', async () => {
      // 期待される動作:
      // 1. コピー先フォルダが既に存在するかチェック
      // 2. 存在する場合はフォルダ衝突情報を返す
      
      const { checkFolderConflicts } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-folder-test-'));
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // 既存のコピー先フォルダを作成
        const today = new Date().toISOString().slice(0, 10);
        const photoDestPath = path.join(photoDestination, `${today}_existing-folder`, 'BF');
        const videoDestPath = path.join(videoDestination, `${today}_existing-folder`, 'BF');
        
        await fs.ensureDir(photoDestPath);
        await fs.ensureDir(videoDestPath);
        
        const conflicts = await checkFolderConflicts(photoDestination, videoDestination, 'existing-folder');
        
        // 期待される結果
        expect(Array.isArray(conflicts)).toBe(true);
        expect(conflicts.length).toBe(2);
        
        const photoFolderConflict = conflicts.find(c => c.type === 'photo');
        const videoFolderConflict = conflicts.find(c => c.type === 'video');
        
        expect(photoFolderConflict).toBeDefined();
        expect(photoFolderConflict.existingPath).toBe(photoDestPath);
        
        expect(videoFolderConflict).toBeDefined();
        expect(videoFolderConflict.existingPath).toBe(videoDestPath);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('copyFilesWithConflictCheck は衝突がある場合エラーを返す', async () => {
      // 期待される動作:
      // 1. コピー実行前に衝突をチェック
      // 2. 衝突がある場合はエラーとして衝突情報を返す
      // 3. ファイルコピーは実行しない
      
      const { copyFilesWithConflictCheck } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-conflict-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // ソースフォルダにテストファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'test photo');
        
        // コピー先に既存ファイルを作成（衝突するファイル）
        const today = new Date().toISOString().slice(0, 10);
        const photoDestPath = path.join(photoDestination, `${today}_conflict-folder`, 'BF');
        
        await fs.ensureDir(photoDestPath);
        await fs.writeFile(path.join(photoDestPath, 'photo1.jpg'), 'existing photo');
        
        const result = await copyFilesWithConflictCheck(sourceFolder, photoDestination, videoDestination, 'conflict-folder');
        
        // 期待される結果
        expect(result.success).toBe(false);
        expect(result.reason).toBe('conflicts');
        expect(result.conflicts).toBeDefined();
        expect(Array.isArray(result.conflicts.files)).toBe(true);
        expect(result.conflicts.files.length).toBe(1);
        expect(result.conflicts.files[0].fileName).toBe('photo1.jpg');
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('copyFilesWithConflictCheck は衝突がない場合は通常のコピーを実行する', async () => {
      // 期待される動作:
      // 1. コピー実行前に衝突をチェック
      // 2. 衝突がない場合は通常のコピー処理を実行
      
      const { copyFilesWithConflictCheck } = require('../src/utils/file-manager');
      const fs = require('fs-extra');
      const path = require('path');
      const os = require('os');
      
      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-no-conflict-copy-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');
      
      try {
        // ソースフォルダにテストファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'test photo');
        
        // コピー先フォルダは存在しない（新規作成）
        
        const result = await copyFilesWithConflictCheck(sourceFolder, photoDestination, videoDestination, 'new-folder');
        
        // 期待される結果
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.copiedPhotos).toBe(1);
        expect(result.copiedVideos).toBe(0);
        
        // ファイルが正常にコピーされていることを確認
        const today = new Date().toISOString().slice(0, 10);
        const photoDestPath = path.join(photoDestination, `${today}_new-folder`, 'BF');
        const copiedFile = path.join(photoDestPath, 'photo1.jpg');
        expect(await fs.pathExists(copiedFile)).toBe(true);
        
      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });
});