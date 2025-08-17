const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

let cacheDir;
let cacheMetaPath;
let cacheMemory = new Map();
let isInitialized = false;

async function initializeThumbnailCache(customCacheDir = null) {
  if (isInitialized) {
    return;
  }
  
  cacheDir = customCacheDir || path.join(os.tmpdir(), 'bf-copy-thumbnails');
  cacheMetaPath = path.join(cacheDir, 'cache-meta.json');
  
  console.log(`キャッシュディレクトリ初期化: ${cacheDir}`);
  
  await fs.ensureDir(cacheDir);
  
  if (!await fs.pathExists(cacheMetaPath)) {
    console.log('キャッシュメタデータを新規作成');
    await fs.writeJson(cacheMetaPath, {
      version: '1.0.0',
      entries: {},
      created: new Date().toISOString()
    });
  } else {
    console.log('既存のキャッシュメタデータを読み込み');
  }
  
  await loadCacheMetadata();
  console.log(`キャッシュエントリ数: ${cacheMemory.size}`);
  
  isInitialized = true;
}

async function loadCacheMetadata() {
  try {
    const metadata = await fs.readJson(cacheMetaPath);
    cacheMemory.clear();
    
    for (const [filePath, cacheInfo] of Object.entries(metadata.entries || {})) {
      cacheMemory.set(filePath, cacheInfo);
    }
  } catch (error) {
    console.error('キャッシュメタデータ読み込みエラー:', error);
    cacheMemory.clear();
  }
}

async function saveCacheMetadata() {
  try {
    const metadata = {
      version: '1.0.0',
      entries: Object.fromEntries(cacheMemory.entries()),
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeJson(cacheMetaPath, metadata);
  } catch (error) {
    console.error('キャッシュメタデータ保存エラー:', error);
  }
}

function generateCacheKey(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex');
}

async function getFileMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      mtime: stats.mtime.getTime(),
      size: stats.size
    };
  } catch (error) {
    return null;
  }
}

async function getCachedThumbnail(filePath) {
  if (!isInitialized) {
    await initializeThumbnailCache();
  }
  
  const cacheInfo = cacheMemory.get(filePath);
  if (!cacheInfo) {
    console.log(`キャッシュ未登録: ${path.basename(filePath)}`);
    return null;
  }
  
  const currentMetadata = await getFileMetadata(filePath);
  if (!currentMetadata) {
    await deleteCacheEntry(filePath);
    return null;
  }
  
  if (currentMetadata.mtime !== cacheInfo.mtime || 
      currentMetadata.size !== cacheInfo.size) {
    console.log(`ファイル変更検出: ${path.basename(filePath)}`);
    await deleteCacheEntry(filePath);
    return null;
  }
  
  const cacheFilePath = path.join(cacheDir, cacheInfo.cacheFileName);
  
  try {
    if (await fs.pathExists(cacheFilePath)) {
      const thumbnailData = await fs.readFile(cacheFilePath, 'utf8');
      
      cacheInfo.lastAccessed = new Date().toISOString();
      await saveCacheMetadata();
      
      return thumbnailData;
    } else {
      await deleteCacheEntry(filePath);
      return null;
    }
  } catch (error) {
    console.error('キャッシュ読み込みエラー:', error);
    await deleteCacheEntry(filePath);
    return null;
  }
}

async function setCachedThumbnail(filePath, thumbnailData) {
  if (!isInitialized) {
    await initializeThumbnailCache();
  }
  
  console.log(`キャッシュ保存開始: ${path.basename(filePath)}`);
  
  const fileMetadata = await getFileMetadata(filePath);
  if (!fileMetadata) {
    throw new Error(`ファイルが見つかりません: ${filePath}`);
  }
  
  const cacheKey = generateCacheKey(filePath);
  const cacheFileName = `${cacheKey}.jpg`;
  const cacheFilePath = path.join(cacheDir, cacheFileName);
  
  try {
    await fs.writeFile(cacheFilePath, thumbnailData);
    
    const cacheInfo = {
      cacheFileName,
      mtime: fileMetadata.mtime,
      size: fileMetadata.size,
      created: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    cacheMemory.set(filePath, cacheInfo);
    console.log(`メモリキャッシュ登録: ${path.basename(filePath)}`);
    
    await saveCacheMetadata();
    console.log(`メタデータ保存完了: ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error('キャッシュ保存エラー:', error);
    throw error;
  }
}

async function deleteCacheEntry(filePath) {
  const cacheInfo = cacheMemory.get(filePath);
  if (cacheInfo) {
    try {
      const cacheFilePath = path.join(cacheDir, cacheInfo.cacheFileName);
      if (await fs.pathExists(cacheFilePath)) {
        await fs.remove(cacheFilePath);
      }
    } catch (error) {
      console.error('キャッシュファイル削除エラー:', error);
    }
    
    cacheMemory.delete(filePath);
    await saveCacheMetadata();
  }
}

async function cleanupOrphanedCache() {
  if (!isInitialized) {
    await initializeThumbnailCache();
  }
  
  let deletedCount = 0;
  const filesToDelete = [];
  
  for (const [filePath, cacheInfo] of cacheMemory.entries()) {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      filesToDelete.push(filePath);
    }
  }
  
  for (const filePath of filesToDelete) {
    await deleteCacheEntry(filePath);
    deletedCount++;
  }
  
  return {
    deletedCount,
    remainingCount: cacheMemory.size
  };
}

async function getCacheStats() {
  if (!isInitialized) {
    await initializeThumbnailCache();
  }
  
  let totalSize = 0;
  
  for (const cacheInfo of cacheMemory.values()) {
    try {
      const cacheFilePath = path.join(cacheDir, cacheInfo.cacheFileName);
      if (await fs.pathExists(cacheFilePath)) {
        const stats = await fs.stat(cacheFilePath);
        totalSize += stats.size;
      }
    } catch (error) {
      console.error('キャッシュファイルサイズ取得エラー:', error);
    }
  }
  
  return {
    totalEntries: cacheMemory.size,
    totalSize,
    cacheDir
  };
}

async function clearAllCache() {
  if (!isInitialized) {
    await initializeThumbnailCache();
  }
  
  try {
    await fs.remove(cacheDir);
    await fs.ensureDir(cacheDir);
    
    await fs.writeJson(cacheMetaPath, {
      version: '1.0.0',
      entries: {},
      created: new Date().toISOString()
    });
    
    cacheMemory.clear();
    
  } catch (error) {
    console.error('キャッシュクリアエラー:', error);
    throw error;
  }
}

async function performMaintenanceCleanup() {
  const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_CACHE_AGE_DAYS = 30;
  
  const stats = await getCacheStats();
  
  if (stats.totalSize > MAX_CACHE_SIZE) {
    await cleanupOldestEntries(stats.totalSize - MAX_CACHE_SIZE);
  }
  
  await cleanupExpiredEntries(MAX_CACHE_AGE_DAYS);
  
  await cleanupOrphanedCache();
}

async function cleanupOldestEntries(bytesToFree) {
  const entries = Array.from(cacheMemory.entries());
  entries.sort((a, b) => {
    const aAccessed = new Date(a[1].lastAccessed || a[1].created);
    const bAccessed = new Date(b[1].lastAccessed || b[1].created);
    return aAccessed.getTime() - bAccessed.getTime();
  });
  
  let freedBytes = 0;
  for (const [filePath, cacheInfo] of entries) {
    if (freedBytes >= bytesToFree) break;
    
    try {
      const cacheFilePath = path.join(cacheDir, cacheInfo.cacheFileName);
      if (await fs.pathExists(cacheFilePath)) {
        const stats = await fs.stat(cacheFilePath);
        await deleteCacheEntry(filePath);
        freedBytes += stats.size;
      }
    } catch (error) {
      console.error('古いキャッシュ削除エラー:', error);
    }
  }
}

async function cleanupExpiredEntries(maxAgeDays) {
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  const expiredFiles = [];
  
  for (const [filePath, cacheInfo] of cacheMemory.entries()) {
    const createdTime = new Date(cacheInfo.created).getTime();
    if (now - createdTime > maxAgeMs) {
      expiredFiles.push(filePath);
    }
  }
  
  for (const filePath of expiredFiles) {
    await deleteCacheEntry(filePath);
  }
}

module.exports = {
  initializeThumbnailCache,
  getCachedThumbnail,
  setCachedThumbnail,
  cleanupOrphanedCache,
  clearAllCache,
  getCacheStats,
  performMaintenanceCleanup
};