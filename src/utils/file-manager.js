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
  
  return null; // 日付形式でない場合はnullを返す
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

    // ソースフォルダ名から日付を抽出
    const sourceFolderName = path.basename(sourceFolderPath);
    const sourceDate = parseFolderDate(sourceFolderName);
    
    // コピー先フォルダパスを生成（元フォルダの日付を使用）
    const photoDestPath = generateDestinationPath(photoDestination, folderName, sourceDate);
    const videoDestPath = generateDestinationPath(videoDestination, folderName, sourceDate);

    // 差分コピー機能: 既存ファイルとコピー対象ファイルを判定
    const fileCheck = await checkForExistingFiles(photoDestPath, videoDestPath, sourceFolderPath);
    
    const copyResults = {
      success: true,
      totalFiles: fileCheck.filesToCopy.length + fileCheck.skippedFiles.length,
      copiedPhotos: 0,
      copiedVideos: 0,
      skippedPhotos: 0,
      skippedVideos: 0,
      errors: [],
      photoDestPath,
      videoDestPath,
      alreadyExists: fileCheck.hasExistingFolders
    };

    // スキップされたファイルの統計を集計
    for (const skippedFile of fileCheck.skippedFiles) {
      if (skippedFile.fileType === 'photo') {
        copyResults.skippedPhotos++;
      } else if (skippedFile.fileType === 'video') {
        copyResults.skippedVideos++;
      }
    }

    // コピー対象ファイルがない場合は早期リターン
    if (fileCheck.filesToCopy.length === 0) {
      console.log('コピー対象ファイルがありません。既存ファイルのみです。');
      return copyResults;
    }

    // 必要なフォルダのみ作成
    if (fileCheck.needsPhotoFolder && !fileCheck.photoFolderExists) {
      await fs.ensureDir(photoDestPath);
    }
    if (fileCheck.needsVideoFolder && !fileCheck.videoFolderExists) {
      await fs.ensureDir(videoDestPath);
    }

    // ファイルをコピー
    let copiedCount = 0;
    for (const { fileName, sourceFilePath, fileType } of fileCheck.filesToCopy) {
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
            total: fileCheck.filesToCopy.length,
            fileName: fileName,
            percentage: Math.round((copiedCount / fileCheck.filesToCopy.length) * 100)
          });
        }
        
        console.log(`コピー完了: ${fileName} -> ${fileType} (${copiedCount}/${fileCheck.filesToCopy.length})`);
        
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

function generateDestinationPath(destination, folderName, sourceDate) {
  // テストで要求されたコピー先パス生成機能を実装
  // sourceDateが指定されている場合はそれを使用、されていない場合は今日の日付を使用
  const path = require('path');
  const dateToUse = sourceDate || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const destFolderName = `${dateToUse}_${folderName}`;
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

async function checkForExistingFiles(photoDestPath, videoDestPath, sourceFolderPath) {
  // 差分コピー機能: 既存ファイルと新規ファイルを判定
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    // ソースフォルダ内のファイルを分析
    const sourceFiles = await fs.readdir(sourceFolderPath);
    const filesToCopy = [];
    const skippedFiles = [];
    let needsPhotoFolder = false;
    let needsVideoFolder = false;
    let hasExistingFolders = false;
    
    // 既存フォルダの存在チェック
    const photoFolderExists = await fs.pathExists(photoDestPath);
    const videoFolderExists = await fs.pathExists(videoDestPath);
    
    let existingPhotoFiles = [];
    let existingVideoFiles = [];
    
    // 既存ファイル一覧を取得
    if (photoFolderExists) {
      existingPhotoFiles = await fs.readdir(photoDestPath);
      hasExistingFolders = true;
    }
    if (videoFolderExists) {
      existingVideoFiles = await fs.readdir(videoDestPath);
      hasExistingFolders = true;
    }
    
    // ソースファイルごとに処理
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(sourceFolderPath, fileName);
      try {
        const stats = await fs.stat(sourceFilePath);
        if (!stats.isFile()) continue;
        
        const fileType = classifyFileType(fileName);
        
        if (fileType === 'photo') {
          needsPhotoFolder = true;
          if (photoFolderExists && existingPhotoFiles.includes(fileName)) {
            // 既存ファイルはスキップ
            skippedFiles.push({ fileName, fileType, sourceFilePath });
          } else {
            // 新規ファイルはコピー対象
            filesToCopy.push({ fileName, fileType, sourceFilePath });
          }
        } else if (fileType === 'video') {
          needsVideoFolder = true;
          if (videoFolderExists && existingVideoFiles.includes(fileName)) {
            // 既存ファイルはスキップ
            skippedFiles.push({ fileName, fileType, sourceFilePath });
          } else {
            // 新規ファイルはコピー対象
            filesToCopy.push({ fileName, fileType, sourceFilePath });
          }
        }
      } catch (error) {
        // ファイル読み取りエラーは無視
        console.error(`ファイル分析エラー: ${fileName}`, error);
        continue;
      }
    }
    
    return {
      filesToCopy,
      skippedFiles,
      needsPhotoFolder,
      needsVideoFolder,
      hasExistingFolders,
      photoFolderExists,
      videoFolderExists
    };
    
  } catch (error) {
    console.error('ファイル差分チェックエラー:', error);
    // エラーが発生した場合は安全のため空のリストを返す
    return {
      filesToCopy: [],
      skippedFiles: [],
      needsPhotoFolder: false,
      needsVideoFolder: false,
      hasExistingFolders: false,
      photoFolderExists: false,
      videoFolderExists: false,
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
    
    // 並列処理数を制限してサムネイルを取得または生成（最大2個同時）
    const MAX_CONCURRENT = 2;
    const results = [];
    
    for (let i = 0; i < selectedFiles.length; i += MAX_CONCURRENT) {
      const batch = selectedFiles.slice(i, i + MAX_CONCURRENT);
      const batchPromises = batch.map(async (fileName) => {
        try {
          const filePath = path.join(folderPath, fileName);
          
          // キャッシュから取得を試行
          const startTime = Date.now();
          let thumbnailData = await getCachedThumbnail(filePath);
          
          if (!thumbnailData) {
            // キャッシュにない場合は新規生成
            console.log(`サムネイル生成中: ${fileName}`);
            thumbnailData = await resizeImageToThumbnail(filePath);
            const generateTime = Date.now() - startTime;
            
            // 生成したサムネイルをキャッシュに保存
            try {
              await setCachedThumbnail(filePath, thumbnailData);
              console.log(`サムネイルキャッシュ保存完了: ${fileName} (生成時間: ${generateTime}ms)`);
            } catch (cacheError) {
              console.error(`サムネイルキャッシュ保存失敗: ${fileName}`, cacheError);
            }
          } else {
            const cacheTime = Date.now() - startTime;
            console.log(`サムネイルキャッシュヒット: ${fileName} (取得時間: ${cacheTime}ms)`);
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
      
      // バッチ処理の完了を待機
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
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

async function getFullSizeImage(imagePath) {
  const fs = require('fs-extra');
  const sharp = require('sharp');
  
  try {
    // ファイルが存在するかチェック
    if (!await fs.pathExists(imagePath)) {
      throw new Error(`画像ファイルが見つかりません: ${imagePath}`);
    }
    
    // 画像を大きなサイズ（最大1200px幅）にリサイズ
    const imageBuffer = await sharp(imagePath)
      .resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true // 元画像より大きくしない
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Base64形式に変換
    const base64Data = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    return base64Data;
  } catch (error) {
    console.error('フルサイズ画像取得エラー:', error);
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
  checkForExistingFiles,
  getImageThumbnails,
  resizeImageToThumbnail,
  getFullSizeImage,
};