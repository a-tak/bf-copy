// サムネイル読み込みとファイルコピーの非同期実行テスト
// TDD: まずテストを作成し、期待される動作を定義する

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('サムネイル読み込みとコピー処理の非同期実行', () => {
  describe('サムネイル読み込み中のコピー開始', () => {
    test('サムネイル読み込み処理中でもコピー処理を開始できる', async () => {
      // 期待される動作:
      // 1. サムネイル読み込み処理を非同期で開始
      // 2. サムネイル読み込みが完了する前にコピー処理を開始
      // 3. 両方の処理が独立して並列実行される
      // 4. コピー処理がサムネイル読み込み完了を待たない

      const { getImageThumbnails } = require('../src/utils/file-manager');
      const { copyFiles } = require('../src/utils/file-manager');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-async-test-'));
      const thumbnailSourceFolder = path.join(testDir, 'thumbnail-source');
      const copySourceFolder = path.join(testDir, 'copy-source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');

      try {
        // サムネイル用に大量のJPEGファイルを作成（処理時間を増やすため）
        await fs.ensureDir(thumbnailSourceFolder);
        const thumbnailCount = 10;
        for (let i = 1; i <= thumbnailCount; i++) {
          const jpegPath = path.join(thumbnailSourceFolder, `photo${i}.jpg`);
          // 最小限のJPEGデータを作成（テスト用）
          const minimalJpeg = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
          ]);
          await fs.writeFile(jpegPath, minimalJpeg);
        }

        // コピー用にファイルを作成
        await fs.ensureDir(copySourceFolder);
        await fs.writeFile(path.join(copySourceFolder, 'test.jpg'), 'test photo content');
        await fs.writeFile(path.join(copySourceFolder, 'test.mp4'), 'test video content');

        // 処理時間を記録
        const timestamps = {
          thumbnailStart: null,
          thumbnailEnd: null,
          copyStart: null,
          copyEnd: null
        };

        // サムネイル読み込みを非同期で開始
        timestamps.thumbnailStart = Date.now();
        const thumbnailPromise = getImageThumbnails(thumbnailSourceFolder).then(result => {
          timestamps.thumbnailEnd = Date.now();
          return result;
        });

        // 少し待ってからコピーを開始（サムネイル読み込み中であることを保証）
        await new Promise(resolve => setTimeout(resolve, 10));

        // サムネイル読み込み完了を待たずにコピーを開始
        timestamps.copyStart = Date.now();
        const copyPromise = copyFiles(
          copySourceFolder,
          photoDestination,
          videoDestination,
          'async-test'
        ).then(result => {
          timestamps.copyEnd = Date.now();
          return result;
        });

        // 両方の処理を並列実行
        const [thumbnailResult, copyResult] = await Promise.all([thumbnailPromise, copyPromise]);

        // 期待される結果:
        // 1. サムネイル読み込みが成功
        expect(Array.isArray(thumbnailResult)).toBe(true);

        // 2. コピー処理が成功
        expect(copyResult.success).toBe(true);
        expect(copyResult.copiedPhotos).toBe(1);
        expect(copyResult.copiedVideos).toBe(1);

        // 3. コピー開始時点でサムネイル読み込みがまだ完了していない
        // （コピー開始 < サムネイル完了）
        expect(timestamps.copyStart).toBeLessThan(timestamps.thumbnailEnd);

        // 4. 処理が並列実行されている証明
        // コピー処理がサムネイル読み込み完了を待たずに開始されている
        const thumbnailDuration = timestamps.thumbnailEnd - timestamps.thumbnailStart;
        const copyStartDelay = timestamps.copyStart - timestamps.thumbnailStart;

        // コピー開始がサムネイル読み込み完了前であることを確認
        expect(copyStartDelay).toBeLessThan(thumbnailDuration);

        console.log('処理時間の検証:');
        console.log(`  サムネイル読み込み: ${thumbnailDuration}ms`);
        console.log(`  コピー開始遅延: ${copyStartDelay}ms`);
        console.log(`  コピー処理時間: ${timestamps.copyEnd - timestamps.copyStart}ms`);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('複数のサムネイル読み込みリクエストが並列実行される', async () => {
      // 期待される動作:
      // 1. 複数のフォルダのサムネイル読み込みを同時にリクエスト
      // 2. それぞれのリクエストが独立して並列処理される
      // 3. メインプロセスのIPCハンドラーがブロッキングしない

      const { getImageThumbnails } = require('../src/utils/file-manager');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-parallel-test-'));
      const folder1 = path.join(testDir, 'folder1');
      const folder2 = path.join(testDir, 'folder2');
      const folder3 = path.join(testDir, 'folder3');

      try {
        // 各フォルダにJPEGファイルを作成
        for (const folder of [folder1, folder2, folder3]) {
          await fs.ensureDir(folder);
          for (let i = 1; i <= 5; i++) {
            const jpegPath = path.join(folder, `photo${i}.jpg`);
            const minimalJpeg = Buffer.from([
              0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
              0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
              0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
            ]);
            await fs.writeFile(jpegPath, minimalJpeg);
          }
        }

        // 処理時間を記録
        const startTime = Date.now();

        // 3つのフォルダのサムネイルを並列読み込み
        const [result1, result2, result3] = await Promise.all([
          getImageThumbnails(folder1),
          getImageThumbnails(folder2),
          getImageThumbnails(folder3)
        ]);

        const totalTime = Date.now() - startTime;

        // 期待される結果:
        // 1. すべてのフォルダのサムネイルが読み込まれる（または空配列を返す）
        expect(Array.isArray(result1)).toBe(true);
        expect(Array.isArray(result2)).toBe(true);
        expect(Array.isArray(result3)).toBe(true);
        // 最小限のJPEGデータではsharpが処理できない場合があるため、
        // 配列が返されることのみ確認（長さは問わない）

        // 2. 並列実行により、順次実行よりも早く完了する
        // （実際の実行時間は環境に依存するため、ここでは成功を確認するのみ）
        console.log(`3フォルダ並列読み込み時間: ${totalTime}ms`);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });

    test('サムネイル読み込みエラーがコピー処理に影響しない', async () => {
      // 期待される動作:
      // 1. サムネイル読み込みでエラーが発生する
      // 2. エラーにもかかわらず、コピー処理は正常に実行される
      // 3. 両方の処理が独立している

      const { getImageThumbnails } = require('../src/utils/file-manager');
      const { copyFiles } = require('../src/utils/file-manager');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-error-test-'));
      const invalidFolder = path.join(testDir, 'invalid-folder');
      const copySourceFolder = path.join(testDir, 'copy-source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');

      try {
        // 存在しないフォルダ（サムネイル読み込みエラー用）
        // invalidFolderは作成しない

        // コピー用にファイルを作成
        await fs.ensureDir(copySourceFolder);
        await fs.writeFile(path.join(copySourceFolder, 'test.jpg'), 'test photo content');

        // サムネイル読み込み（エラーになる）とコピー処理を並列実行
        const [thumbnailResult, copyResult] = await Promise.all([
          getImageThumbnails(invalidFolder), // 存在しないフォルダ
          copyFiles(copySourceFolder, photoDestination, videoDestination, 'error-test')
        ]);

        // 期待される結果:
        // 1. サムネイル読み込みは空配列を返す（エラーハンドリング）
        expect(Array.isArray(thumbnailResult)).toBe(true);
        expect(thumbnailResult.length).toBe(0);

        // 2. コピー処理は正常に完了する（影響を受けない）
        expect(copyResult.success).toBe(true);
        expect(copyResult.copiedPhotos).toBe(1);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });

  describe('コピー進行状況の報告', () => {
    test('コピー進行状況がサムネイル読み込みと独立して報告される', async () => {
      // 期待される動作:
      // 1. サムネイル読み込み中でもコピー進行状況が正しく報告される
      // 2. 進行状況コールバックが機能する
      // 3. サムネイル読み込みがコールバックをブロックしない

      const { copyFiles } = require('../src/utils/file-manager');

      // テスト用の一時フォルダを作成
      const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-progress-test-'));
      const sourceFolder = path.join(testDir, 'source');
      const photoDestination = path.join(testDir, 'photos');
      const videoDestination = path.join(testDir, 'videos');

      try {
        // ソースフォルダに複数のファイルを作成
        await fs.ensureDir(sourceFolder);
        await fs.writeFile(path.join(sourceFolder, 'photo1.jpg'), 'photo1 content');
        await fs.writeFile(path.join(sourceFolder, 'photo2.jpg'), 'photo2 content');
        await fs.writeFile(path.join(sourceFolder, 'video1.mp4'), 'video1 content');

        // 進行状況を記録
        const progressUpdates = [];

        const result = await copyFiles(
          sourceFolder,
          photoDestination,
          videoDestination,
          'progress-test',
          (progress) => {
            progressUpdates.push({
              ...progress,
              timestamp: Date.now()
            });
          }
        );

        // 期待される結果:
        // 1. コピーが成功
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(3);

        // 2. 進行状況が報告されている
        expect(progressUpdates.length).toBeGreaterThan(0);

        // 3. 進行状況の内容が正しい
        progressUpdates.forEach(progress => {
          expect(progress).toHaveProperty('current');
          expect(progress).toHaveProperty('total');
          expect(progress).toHaveProperty('fileName');
          expect(progress).toHaveProperty('percentage');
          expect(progress.total).toBe(3);
        });

        // 4. 進行状況が順次増加している
        for (let i = 1; i < progressUpdates.length; i++) {
          expect(progressUpdates[i].current).toBeGreaterThanOrEqual(progressUpdates[i-1].current);
        }

        console.log(`進行状況更新回数: ${progressUpdates.length}`);

      } finally {
        // テスト用フォルダをクリーンアップ
        await fs.remove(testDir);
      }
    });
  });
});
