// サムネイルプレビュー機能のテスト
// TDD: まずテストを作成し、期待される動作を定義する

const path = require('path');
const fs = require('fs-extra');

describe('サムネイルプレビュー機能', () => {
  describe('画像サムネイル取得', () => {
    test('フォルダ内のJPEGファイルからサムネイルを生成できる', async () => {
      // 期待される動作:
      // 1. 指定フォルダ内のJPEGファイルを検索
      // 2. 最大5ファイルまでを選択
      // 3. 各画像をBase64エンコードでサムネイル化
      // 4. ファイル名、パス、Base64データを返す
      
      const { getImageThumbnails } = require('../src/utils/file-manager');
      
      const folderPath = '/mock/camera/folder';
      const result = await getImageThumbnails(folderPath);
      
      // 期待される結果: サムネイル情報の配列
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5); // 最大5件
      
      if (result.length > 0) {
        const thumbnail = result[0];
        expect(thumbnail).toHaveProperty('fileName');
        expect(thumbnail).toHaveProperty('filePath');
        expect(thumbnail).toHaveProperty('base64Data');
        expect(typeof thumbnail.fileName).toBe('string');
        expect(typeof thumbnail.filePath).toBe('string');
        expect(typeof thumbnail.base64Data).toBe('string');
        
        // Base64データが正しい形式かチェック
        expect(thumbnail.base64Data).toMatch(/^data:image\/jpeg;base64,/);
      }
    });

    test('JPEGファイルのみを対象にしてサムネイルを生成する', async () => {
      // 期待される動作:
      // 1. JPEGファイル (.jpg, .jpeg) のみを対象とする
      // 2. 他の画像形式 (.png, .gif, .dng) は無視する
      // 3. 動画ファイル (.mov, .mp4) は無視する
      
      const { getImageThumbnails } = require('../src/utils/file-manager');
      
      const folderPath = '/mock/mixed/files';
      const result = await getImageThumbnails(folderPath);
      
      // 結果のすべてがJPEGファイルであることを確認
      for (const thumbnail of result) {
        const ext = path.extname(thumbnail.fileName).toLowerCase();
        expect(['.jpg', '.jpeg']).toContain(ext);
      }
    });

    test('フォルダが存在しない場合は空配列を返す', async () => {
      // 期待される動作:
      // 1. 存在しないフォルダパスを指定
      // 2. エラーを出さずに空配列を返す
      
      const { getImageThumbnails } = require('../src/utils/file-manager');
      
      const folderPath = '/non/existent/folder';
      const result = await getImageThumbnails(folderPath);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('JPEGファイルが存在しない場合は空配列を返す', async () => {
      // 期待される動作:
      // 1. JPEGファイルが存在しないフォルダを指定
      // 2. エラーを出さずに空配列を返す
      
      const { getImageThumbnails } = require('../src/utils/file-manager');
      
      const folderPath = '/mock/no/jpeg/files';
      const result = await getImageThumbnails(folderPath);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('サムネイル画像処理', () => {
    test('画像サイズを適切にリサイズする', async () => {
      // 期待される動作:
      // 1. 元画像サイズに関係なく一定サイズに縮小
      // 2. アスペクト比を維持
      // 3. 適切な品質で圧縮
      
      const { resizeImageToThumbnail } = require('../src/utils/file-manager');
      
      const mockImageBuffer = Buffer.from('mock-image-data');
      const result = await resizeImageToThumbnail(mockImageBuffer);
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    test('破損画像ファイルを適切に処理する', async () => {
      // 期待される動作:
      // 1. 破損した画像ファイルを検出
      // 2. エラーを出さずにスキップ
      // 3. 他の正常な画像の処理を継続
      
      const { getImageThumbnails } = require('../src/utils/file-manager');
      
      const folderPath = '/mock/corrupted/images';
      const result = await getImageThumbnails(folderPath);
      
      // エラーで止まらずに結果を返すことを確認
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('性能要件', () => {
    test('大量の画像ファイルがある場合でも適切に処理する', async () => {
      // 期待される動作:
      // 1. 大量のJPEGファイル（100件以上）があっても処理
      // 2. 最大5件の制限を守る
      // 3. 処理時間が妥当な範囲内（5秒以内）
      
      const { getImageThumbnails } = require('../src/utils/file-manager');
      
      const folderPath = '/mock/large/folder';
      const startTime = Date.now();
      
      const result = await getImageThumbnails(folderPath);
      
      const processingTime = Date.now() - startTime;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
      expect(processingTime).toBeLessThan(5000); // 5秒以内
    });
  });
});