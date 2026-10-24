const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// 各テストは別プロセスでの起動と同様に、キャッシュのモジュール状態も分離する。
function loadFreshCacheModule() {
  let cache;
  jest.isolateModules(() => {
    cache = require('../src/utils/thumbnail-cache');
  });
  return cache;
}

describe('サムネイルキャッシュ機能', () => {
  const temporaryRoot = path.resolve(os.tmpdir());
  let testRoot;
  let testCacheDir;
  let testImagePath;
  let testFolderPath;
  let initializeThumbnailCache;
  let getCachedThumbnail;
  let setCachedThumbnail;
  let cleanupOrphanedCache;
  let clearAllCache;
  let getCacheStats;

  beforeEach(async () => {
    testRoot = await fs.mkdtemp(path.join(temporaryRoot, 'bf-copy-cache-test-'));
    testCacheDir = path.join(testRoot, 'cache');
    testFolderPath = path.join(testRoot, 'images');
    testImagePath = path.join(testFolderPath, 'test-image.jpg');
    await fs.ensureDir(testFolderPath);
    await fs.writeFile(testImagePath, Buffer.from('fake-jpeg-data', 'utf8'));

    ({ initializeThumbnailCache, getCachedThumbnail, setCachedThumbnail,
      cleanupOrphanedCache, clearAllCache, getCacheStats } = loadFreshCacheModule());
    await initializeThumbnailCache(testCacheDir);
  });

  afterEach(async () => {
    // 削除対象はこのテストが mkdtemp で作成したディレクトリだけ。
    expect(path.dirname(testRoot)).toBe(temporaryRoot);
    expect(path.basename(testRoot)).toMatch(/^bf-copy-cache-test-/);
    await fs.remove(testRoot);
  });

  describe('キャッシュ初期化', () => {
    test('キャッシュディレクトリが作成される', async () => {
      expect(await fs.pathExists(testCacheDir)).toBe(true);
    });

    test('メタデータファイルが作成される', async () => {
      const metaFile = path.join(testCacheDir, 'cache-meta.json');
      expect(await fs.pathExists(metaFile)).toBe(true);
    });
  });

  describe('初期化と再起動時の状態', () => {
    test('初期化を繰り返しても保存済みキャッシュは保持される', async () => {
      const thumbnailData = 'data:image/webp;base64,existing-thumbnail';
      await setCachedThumbnail(testImagePath, thumbnailData);

      await initializeThumbnailCache(testCacheDir);

      expect(await getCachedThumbnail(testImagePath)).toBe(thumbnailData);
      expect((await getCacheStats()).totalEntries).toBe(1);
    });

    test('新しいモジュールはディスクのメタデータからキャッシュを復元する', async () => {
      const thumbnailData = 'data:image/webp;base64,persisted-thumbnail';
      await setCachedThumbnail(testImagePath, thumbnailData);
      const restarted = loadFreshCacheModule();

      await restarted.initializeThumbnailCache(testCacheDir);

      expect(await restarted.getCachedThumbnail(testImagePath)).toBe(thumbnailData);
      expect((await restarted.getCacheStats()).totalEntries).toBe(1);
    });
  });

  describe('キャッシュ保存と取得', () => {
    test('サムネイルをキャッシュに保存できる', async () => {
      const thumbnailData = 'data:image/webp;base64,test-thumbnail-data';
      
      await setCachedThumbnail(testImagePath, thumbnailData);
      
      const cached = await getCachedThumbnail(testImagePath);
      expect(cached).toBe(thumbnailData);
    });

    test('存在しないキャッシュはnullを返す', async () => {
      const nonExistentPath = path.join(testFolderPath, 'non-existent.jpg');
      
      const cached = await getCachedThumbnail(nonExistentPath);
      expect(cached).toBeNull();
    });

    test('ファイル更新時刻が変わるとキャッシュが無効になる', async () => {
      const thumbnailData = 'data:image/webp;base64,test-thumbnail-data';
      
      await setCachedThumbnail(testImagePath, thumbnailData);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      await fs.writeFile(testImagePath, Buffer.from('updated-fake-jpeg-data', 'utf8'));
      
      const cached = await getCachedThumbnail(testImagePath);
      expect(cached).toBeNull();
    });
  });

  describe('孤立キャッシュの削除', () => {
    test('存在しないファイルのキャッシュが削除される', async () => {
      const thumbnailData = 'data:image/webp;base64,test-thumbnail-data';
      const deletedImagePath = path.join(testFolderPath, 'to-be-deleted.jpg');
      
      await fs.writeFile(deletedImagePath, Buffer.from('fake-jpeg-data', 'utf8'));
      await setCachedThumbnail(deletedImagePath, thumbnailData);
      
      expect(await getCachedThumbnail(deletedImagePath)).toBe(thumbnailData);
      
      await fs.remove(deletedImagePath);
      
      const cleanupResult = await cleanupOrphanedCache();
      expect(cleanupResult.deletedCount).toBe(1);
      
      const cachedAfterCleanup = await getCachedThumbnail(deletedImagePath);
      expect(cachedAfterCleanup).toBeNull();
    });

    test('存在するファイルのキャッシュは残る', async () => {
      const thumbnailData = 'data:image/webp;base64,test-thumbnail-data';
      
      await setCachedThumbnail(testImagePath, thumbnailData);
      
      const cleanupResult = await cleanupOrphanedCache();
      expect(cleanupResult.deletedCount).toBe(0);
      
      const cached = await getCachedThumbnail(testImagePath);
      expect(cached).toBe(thumbnailData);
    });
  });

  describe('キャッシュ統計情報', () => {
    test('キャッシュ統計情報を取得できる', async () => {
      const thumbnailData1 = 'data:image/webp;base64,test-thumbnail-data-1';
      const thumbnailData2 = 'data:image/webp;base64,test-thumbnail-data-2';
      
      const testImagePath2 = path.join(testFolderPath, 'test-image-2.jpg');
      await fs.writeFile(testImagePath2, Buffer.from('fake-jpeg-data-2', 'utf8'));
      
      await setCachedThumbnail(testImagePath, thumbnailData1);
      await setCachedThumbnail(testImagePath2, thumbnailData2);
      
      const stats = await getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      
      await fs.remove(testImagePath2);
    });
  });

  describe('キャッシュクリア', () => {
    test('全キャッシュをクリアできる', async () => {
      const thumbnailData = 'data:image/webp;base64,test-thumbnail-data';
      
      await setCachedThumbnail(testImagePath, thumbnailData);
      expect(await getCachedThumbnail(testImagePath)).toBe(thumbnailData);
      
      await clearAllCache();
      
      const cached = await getCachedThumbnail(testImagePath);
      expect(cached).toBeNull();
      
      const stats = await getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });
});