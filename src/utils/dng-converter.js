// DNG変換ユーティリティ
// Adobe DNG Converterを使用してRW2ファイルをDNGに変換

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Adobe DNG Converterのデフォルトパスを取得
 * @returns {string} DNG Converterの実行ファイルパス
 */
function getDngConverterPath() {
  return 'C:\\Program Files\\Adobe\\Adobe DNG Converter\\Adobe DNG Converter.exe';
}

/**
 * Adobe DNG Converterがインストールされているかを検出
 * @returns {Promise<boolean>} インストール済みの場合true
 */
async function detectDngConverter() {
  const converterPath = getDngConverterPath();

  try {
    const exists = await fs.pathExists(converterPath);
    return exists;
  } catch (error) {
    console.error('Adobe DNG Converter検出エラー:', error);
    return false;
  }
}

/**
 * RW2ファイルをDNGに変換
 * @param {string} rw2FilePath - 変換するRW2ファイルのパス
 * @param {string} outputDirectory - DNG出力先ディレクトリ
 * @param {Function} progressCallback - 進捗コールバック（オプション）
 * @returns {Promise<Object>} 変換結果 { success: boolean, error?: string, message?: string }
 */
async function convertRw2ToDng(rw2FilePath, outputDirectory, progressCallback) {
  try {
    // RW2ファイルの存在確認
    if (!await fs.pathExists(rw2FilePath)) {
      return {
        success: false,
        error: 'FILE_NOT_FOUND',
        message: `RW2ファイルが見つかりません: ${rw2FilePath}`
      };
    }

    // 出力ディレクトリの存在確認・作成
    await fs.ensureDir(outputDirectory);

    // Adobe DNG Converterのパス
    const converterPath = getDngConverterPath();

    // Adobe DNG Converterが存在するか確認
    if (!await fs.pathExists(converterPath)) {
      return {
        success: false,
        error: 'DNG_CONVERTER_NOT_FOUND',
        message: 'Adobe DNG Converterが見つかりません'
      };
    }

    // 変換処理を実行
    const conversionResult = await executeConversion(converterPath, rw2FilePath, outputDirectory, progressCallback);

    return conversionResult;

  } catch (error) {
    console.error('RW2→DNG変換エラー:', error);
    return {
      success: false,
      error: 'CONVERSION_ERROR',
      message: error.message || '変換中にエラーが発生しました'
    };
  }
}

/**
 * Adobe DNG Converterを実行して変換処理を行う
 * @param {string} converterPath - DNG Converterの実行ファイルパス
 * @param {string} inputFile - 入力RW2ファイル
 * @param {string} outputDirectory - 出力ディレクトリ
 * @param {Function} progressCallback - 進捗コールバック（オプション）
 * @returns {Promise<Object>} 変換結果
 */
function executeConversion(converterPath, inputFile, outputDirectory, progressCallback) {
  return new Promise((resolve, reject) => {
    const args = ['-c', '-d', outputDirectory, inputFile];

    console.log(`Adobe DNG Converter実行: ${converterPath}`);
    console.log(`引数: ${args.join(' ')}`);

    const conversionProcess = spawn(converterPath, args, {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    // 標準出力のキャプチャ
    conversionProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // 標準エラー出力のキャプチャ
    conversionProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // プロセス終了時の処理
    conversionProcess.on('close', async (code) => {
      try {
        // 出力ファイル名を生成（拡張子を .dng に変更）
        const baseName = path.basename(inputFile, path.extname(inputFile));
        const outputFileName = baseName + '.dng';
        const outputFilePath = path.join(outputDirectory, outputFileName);

        // 出力ファイルの存在を確認
        const outputExists = await fs.pathExists(outputFilePath);

        if (outputExists) {
          console.log(`DNG変換成功: ${outputFileName}`);
          resolve({
            success: true,
            outputFile: outputFilePath
          });
        } else {
          console.error(`DNG変換失敗: 出力ファイルが生成されませんでした (終了コード: ${code})`);
          console.error(`標準出力: ${stdout}`);
          console.error(`標準エラー出力: ${stderr}`);
          resolve({
            success: false,
            error: 'CONVERSION_FAILED',
            message: `出力ファイルが生成されませんでした (終了コード: ${code})`
          });
        }
      } catch (error) {
        reject(error);
      }
    });

    // プロセスエラー時の処理
    conversionProcess.on('error', (error) => {
      console.error('Adobe DNG Converterプロセスエラー:', error);
      resolve({
        success: false,
        error: 'PROCESS_ERROR',
        message: `プロセス実行エラー: ${error.message}`
      });
    });

    // タイムアウト設定（30秒）
    const timeout = setTimeout(() => {
      conversionProcess.kill();
      resolve({
        success: false,
        error: 'TIMEOUT',
        message: '変換処理がタイムアウトしました（30秒）'
      });
    }, 30000);

    // プロセス終了時にタイムアウトをクリア
    conversionProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * 複数のRW2ファイルを一括でDNGに変換
 * @param {Array} rw2Files - RW2ファイルのリスト [{fileName, filePath}, ...]
 * @param {string} outputDirectory - DNG出力先ディレクトリ
 * @param {Function} progressCallback - 進捗コールバック（オプション）
 * @param {number} copiedCount - 既にコピーしたファイル数
 * @param {number} totalFiles - 全ファイル数
 * @returns {Promise<Object>} 変換結果 { successCount, errors }
 */
async function convertMultipleRw2ToDng(rw2Files, outputDirectory, progressCallback, copiedCount, totalFiles) {
  const results = {
    successCount: 0,
    errors: []
  };

  try {
    // 出力ディレクトリの存在確認・作成
    await fs.ensureDir(outputDirectory);

    // Adobe DNG Converterのパス
    const converterPath = getDngConverterPath();

    // Adobe DNG Converterが存在するか確認
    if (!await fs.pathExists(converterPath)) {
      return {
        successCount: 0,
        errors: [{
          fileName: '全ファイル',
          error: 'Adobe DNG Converterが見つかりません'
        }]
      };
    }

    // 全RW2ファイルのパスを配列にまとめる
    const inputFiles = rw2Files.map(f => f.filePath);

    console.log(`一括変換実行: ${inputFiles.length}ファイル`);
    console.log(`Adobe DNG Converter実行: ${converterPath}`);

    // 複数ファイルを一度に渡して変換実行
    const conversionResult = await executeBatchConversion(converterPath, inputFiles, outputDirectory, progressCallback);

    // 各ファイルの変換結果を確認
    for (const rw2File of rw2Files) {
      const baseName = path.basename(rw2File.filePath, path.extname(rw2File.filePath));
      const outputFileName = baseName + '.dng';
      const outputFilePath = path.join(outputDirectory, outputFileName);

      const outputExists = await fs.pathExists(outputFilePath);
      if (outputExists) {
        console.log(`DNG変換成功: ${rw2File.fileName}`);
        results.successCount++;
      } else {
        console.error(`DNG変換失敗: ${rw2File.fileName} (出力ファイルが生成されませんでした)`);
        results.errors.push({
          fileName: rw2File.fileName,
          error: 'DNG変換失敗: 出力ファイルが生成されませんでした'
        });
      }
    }

  } catch (error) {
    console.error('RW2一括変換エラー:', error);
    results.errors.push({
      fileName: '一括変換',
      error: error.message || '一括変換中にエラーが発生しました'
    });
  }

  return results;
}

/**
 * Adobe DNG Converterを実行して複数ファイルを一括変換
 * @param {string} converterPath - DNG Converterの実行ファイルパス
 * @param {Array} inputFiles - 入力RW2ファイルパスの配列
 * @param {string} outputDirectory - 出力ディレクトリ
 * @param {Function} progressCallback - 進捗コールバック（オプション）
 * @returns {Promise<Object>} 変換結果
 */
function executeBatchConversion(converterPath, inputFiles, outputDirectory, progressCallback) {
  return new Promise((resolve, reject) => {
    // 引数: -c -d [出力先] [入力ファイル1] [入力ファイル2] ...
    const args = ['-c', '-d', outputDirectory, ...inputFiles];

    console.log(`Adobe DNG Converter引数: ${args.length}個 (最初の数個: ${args.slice(0, 5).join(', ')}...)`);

    const conversionProcess = spawn(converterPath, args, {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let processedCount = 0;
    const totalFiles = inputFiles.length;

    // 標準出力のキャプチャと進捗推定
    conversionProcess.stdout.on('data', (data) => {
      stdout += data.toString();

      // Adobe DNG Converterの出力を監視して進捗を推定
      // 各ファイル処理時に何か出力があれば、それをカウント
      const output = data.toString();

      // ファイル名が出力に含まれていれば処理中と判断
      // （Adobe DNG Converterは処理中のファイル名を出力する可能性がある）
      if (output.includes('.rw2') || output.includes('.RW2') || output.includes('Converting')) {
        processedCount++;
        const percentage = Math.min(Math.round((processedCount / totalFiles) * 100), 99);

        // 進捗コールバックを呼び出し
        if (progressCallback) {
          progressCallback({
            current: processedCount,
            total: totalFiles,
            fileName: '',
            percentage: 100,
            message: `DNG変換中: ${processedCount}/${totalFiles}ファイル処理中 (${percentage}%)`
          });
        }

        console.log(`変換進捗: ${processedCount}/${totalFiles} (${percentage}%)`);
      }
    });

    // 標準エラー出力のキャプチャ
    conversionProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // プロセス終了時の処理
    conversionProcess.on('close', async (code) => {
      console.log(`Adobe DNG Converter終了: 終了コード ${code}`);
      console.log(`標準出力: ${stdout}`);
      if (stderr) {
        console.error(`標準エラー出力: ${stderr}`);
      }

      resolve({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr
      });
    });

    // プロセスエラー時の処理
    conversionProcess.on('error', (error) => {
      console.error('Adobe DNG Converterプロセスエラー:', error);
      resolve({
        success: false,
        error: error.message
      });
    });

    // タイムアウト設定（5分 = 300秒、複数ファイルなので長めに設定）
    const timeout = setTimeout(() => {
      conversionProcess.kill();
      resolve({
        success: false,
        error: '変換処理がタイムアウトしました（5分）'
      });
    }, 300000);

    // プロセス終了時にタイムアウトをクリア
    conversionProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

module.exports = {
  getDngConverterPath,
  detectDngConverter,
  convertRw2ToDng,
  convertMultipleRw2ToDng
};
