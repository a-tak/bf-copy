// ファイル管理ユーティリティ
// TDD: テストで要求された関数のスタブを作成

// この関数群はテストをパスするために実装される

async function getCameraFolders(cameraPath) {
  // テストで要求されたカメラフォルダ一覧取得機能を実装
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    const dcimPath = path.join(cameraPath, 'DCIM');
    
    // DCIMフォルダ内のディレクトリを取得
    const items = await fs.readdir(dcimPath, { withFileTypes: true });
    const folders = [];
    
    for (const item of items) {
      if (item.isDirectory()) {
        const folderPath = path.join(dcimPath, item.name);
        
        try {
          const files = await fs.readdir(folderPath);
          const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|dng|mov|mp4)$/i.test(file)
          );
          
          const displayDate = parseFolderDate(item.name);
          
          folders.push({
            name: item.name,
            path: folderPath,
            files: imageFiles.length,
            date: displayDate,
            size: await getFolderSize(folderPath)
          });
        } catch (error) {
          console.error(`フォルダアクセスエラー: ${folderPath}`, error);
        }
      }
    }
    
    // 日付順でソート（新しい順）
    folders.sort((a, b) => b.name.localeCompare(a.name));
    
    return folders;
  } catch (error) {
    console.error('カメラフォルダ取得エラー:', error);
    return [];
  }
}

// フォルダサイズを取得する補助関数
async function getFolderSize(folderPath) {
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    const files = await fs.readdir(folderPath);
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      } catch (error) {
        // ファイルアクセスエラーは無視
      }
    }
    
    return formatFileSize(totalSize);
  } catch (error) {
    return '不明';
  }
}

function parseFolderDate(folderName) {
  // テストで要求された日付フォルダ名解析機能を実装
  // "YYMMDD_N" 形式のフォルダ名を "YYYY-MM-DD" 形式に変換
  const dateMatch = folderName.match(/^(\d{6})_(\d+)$/);
  
  if (dateMatch) {
    const [, yymmdd] = dateMatch;
    const year = 2000 + parseInt(yymmdd.substr(0, 2));
    const month = yymmdd.substr(2, 2);
    const day = yymmdd.substr(4, 2);
    return `${year}-${month}-${day}`;
  }
  
  return folderName; // 日付形式でない場合はそのまま返す
}

function formatFileSize(bytes) {
  // テストで要求されたファイルサイズフォーマット機能を実装
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

async function copyFiles(sourceFolderPath, photoDestination, videoDestination, folderName, progressCallback) {
  // テストで要求されたファイルコピー機能を実装
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    console.log('コピー開始:', {
      source: sourceFolderPath,
      photoDestination,
      videoDestination,
      folderName
    });

    // コピー先フォルダパスを生成
    const photoDestPath = generateDestinationPath(photoDestination, folderName);
    const videoDestPath = generateDestinationPath(videoDestination, folderName);

    // 上書禁止: 既存フォルダの存在チェック
    const overwriteCheck = await checkForExistingFolders(photoDestPath, videoDestPath, sourceFolderPath);
    if (overwriteCheck.hasConflict) {
      return {
        success: false,
        message: `フォルダが既に存在します: ${overwriteCheck.conflictPath}`,
        overwritePrevented: true,
        conflictPath: overwriteCheck.conflictPath,
        photoDestPath,
        videoDestPath
      };
    }

    // ソースフォルダからファイル一覧を取得
    const sourceFiles = await fs.readdir(sourceFolderPath);
    
    const copyResults = {
      success: true,
      totalFiles: 0,
      copiedPhotos: 0,
      copiedVideos: 0,
      errors: [],
      photoDestPath,
      videoDestPath
    };

    // 先にファイルを分類して、必要なフォルダのみ作成する
    const filesToCopy = [];
    let hasPhotos = false;
    let hasVideos = false;

    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(sourceFolderPath, fileName);
      const stats = await fs.stat(sourceFilePath);
      
      if (!stats.isFile()) continue;

      copyResults.totalFiles++;
      
      // ファイル拡張子で写真/動画を判定
      const fileType = classifyFileType(fileName);
      filesToCopy.push({ fileName, sourceFilePath, fileType });
      
      if (fileType === 'photo') {
        hasPhotos = true;
      } else if (fileType === 'video') {
        hasVideos = true;
      }
    }

    // 対象ファイルがある場合のみ、コピー先フォルダを作成
    if (hasPhotos) {
      await fs.ensureDir(photoDestPath);
    }
    if (hasVideos) {
      await fs.ensureDir(videoDestPath);
    }

    // ファイルをコピー
    let copiedCount = 0;
    for (const { fileName, sourceFilePath, fileType } of filesToCopy) {
      let destPath;
      
      if (fileType === 'photo') {
        destPath = path.join(photoDestPath, fileName);
      } else { // fileType === 'video'
        destPath = path.join(videoDestPath, fileName);
      }

      try {
        // ファイルコピー
        await fs.copy(sourceFilePath, destPath, { 
          overwrite: false, // 既存ファイルは上書きしない
          errorOnExist: false 
        });
        
        if (fileType === 'photo') {
          copyResults.copiedPhotos++;
        } else { // fileType === 'video'
          copyResults.copiedVideos++;
        }
        
        copiedCount++;
        
        // 進行状況をコールバック
        if (progressCallback) {
          progressCallback({
            current: copiedCount,
            total: copyResults.totalFiles,
            fileName: fileName,
            percentage: Math.round((copiedCount / copyResults.totalFiles) * 100)
          });
        }
        
        console.log(`コピー完了: ${fileName} -> ${fileType} (${copiedCount}/${copyResults.totalFiles})`);
        
      } catch (error) {
        console.error(`ファイルコピーエラー: ${fileName}`, error);
        copyResults.errors.push({
          fileName,
          error: error.message
        });
      }
    }

    console.log('コピー結果:', copyResults);
    return copyResults;

  } catch (error) {
    console.error('コピー処理エラー:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

function classifyFileType(fileName) {
  // テストで要求されたファイル分類機能を実装
  const ext = require('path').extname(fileName).toLowerCase();
  
  const photoExtensions = ['.jpg', '.jpeg', '.dng', '.raw', '.tiff', '.tif', '.heif', '.heic'];
  const videoExtensions = ['.mov', '.mp4', '.avi', '.mkv', '.m4v'];
  
  if (photoExtensions.includes(ext)) {
    return 'photo';
  } else if (videoExtensions.includes(ext)) {
    return 'video';
  } else {
    // 不明な拡張子は写真として扱う
    return 'photo';
  }
}

function generateDestinationPath(destination, folderName) {
  // テストで要求されたコピー先パス生成機能を実装
  // "YYYY-MM-DD_フォルダ名/BF" 形式でフォルダパスを生成
  const path = require('path');
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const destFolderName = `${today}_${folderName}`;
  return path.join(destination, destFolderName, 'BF');
}

async function checkForExistingFolders(photoDestPath, videoDestPath, sourceFolderPath) {
  // 上書禁止機能: 既存フォルダの存在チェック
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    // ソースフォルダ内のファイルを分析して、どのタイプのフォルダが必要かを判定
    const sourceFiles = await fs.readdir(sourceFolderPath);
    let needsPhotoFolder = false;
    let needsVideoFolder = false;
    
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(sourceFolderPath, fileName);
      try {
        const stats = await fs.stat(sourceFilePath);
        if (!stats.isFile()) continue;
        
        const fileType = classifyFileType(fileName);
        if (fileType === 'photo') {
          needsPhotoFolder = true;
        } else if (fileType === 'video') {
          needsVideoFolder = true;
        }
      } catch (error) {
        // ファイル読み取りエラーは無視
        continue;
      }
    }
    
    // 必要なフォルダのみ存在チェックを実行
    if (needsPhotoFolder && await fs.pathExists(photoDestPath)) {
      return {
        hasConflict: true,
        conflictPath: photoDestPath
      };
    }
    
    if (needsVideoFolder && await fs.pathExists(videoDestPath)) {
      return {
        hasConflict: true,
        conflictPath: videoDestPath
      };
    }
    
    return {
      hasConflict: false,
      conflictPath: null
    };
    
  } catch (error) {
    console.error('フォルダ存在チェックエラー:', error);
    // エラーが発生した場合は安全のため競合ありとして扱う
    return {
      hasConflict: true,
      conflictPath: photoDestPath,
      error: error.message
    };
  }
}

async function getImageThumbnails(folderPath) {
  const fs = require('fs-extra');
  const path = require('path');
  const { getCachedThumbnail, setCachedThumbnail, initializeThumbnailCache } = require('./thumbnail-cache');
  
  try {
    // キャッシュシステムを初期化
    await initializeThumbnailCache();
    
    // フォルダが存在するかチェック
    if (!await fs.pathExists(folderPath)) {
      return [];
    }
    
    // フォルダ内のファイル一覧を取得
    const files = await fs.readdir(folderPath);
    
    // JPEGファイルのみを抽出
    const jpegFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg'].includes(ext);
    });
    
    // 最大5ファイルまで制限
    const selectedFiles = jpegFiles.slice(0, 5);
    
    // 並列処理でサムネイルを取得または生成
    const thumbnailPromises = selectedFiles.map(async (fileName) => {
      try {
        const filePath = path.join(folderPath, fileName);
        
        // キャッシュから取得を試行
        let thumbnailData = await getCachedThumbnail(filePath);
        
        if (!thumbnailData) {
          // キャッシュにない場合は新規生成
          console.log(`サムネイル生成中: ${fileName}`);
          thumbnailData = await resizeImageToThumbnail(filePath);
          
          // 生成したサムネイルをキャッシュに保存
          await setCachedThumbnail(filePath, thumbnailData);
          console.log(`サムネイルキャッシュ保存: ${fileName}`);
        } else {
          console.log(`サムネイルキャッシュヒット: ${fileName}`);
        }
        
        return {
          fileName: fileName,
          filePath: filePath,
          base64Data: thumbnailData
        };
      } catch (error) {
        console.error(`サムネイル処理エラー: ${fileName}`, error);
        return null;
      }
    });
    
    // 全ての並列処理の完了を待機
    const results = await Promise.all(thumbnailPromises);
    
    // nullを除外して有効なサムネイルのみを返す
    const thumbnails = results.filter(result => result !== null);
    
    return thumbnails;
  } catch (error) {
    console.error('フォルダ内画像取得エラー:', error);
    return [];
  }
}

async function resizeImageToThumbnail(imageInput) {
  const sharp = require('sharp');
  
  try {
    let imageBuffer;
    
    // 入力がファイルパス（文字列）の場合とBufferの場合を処理
    if (typeof imageInput === 'string') {
      // ファイルパスの場合、ファイルを読み込み
      imageBuffer = await sharp(imageInput)
        .resize(150, 100, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } else {
      // Bufferの場合、そのまま処理
      imageBuffer = await sharp(imageInput)
        .resize(150, 100, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    }
    
    // Base64形式に変換
    const base64Data = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    return base64Data;
  } catch (error) {
    console.error('画像リサイズエラー:', error);
    throw error;
  }
}

module.exports = {
  getCameraFolders,
  parseFolderDate,
  formatFileSize,
  copyFiles,
  classifyFileType,
  generateDestinationPath,
  checkForExistingFolders,
  getImageThumbnails,
  resizeImageToThumbnail,
};