const fs = require('fs');
const path = require('path');

// 簡易ICOファイル作成関数
function createIcoFromPng(pngPath, icoPath) {
  try {
    const pngData = fs.readFileSync(pngPath);
    
    // ICOヘッダー (6バイト)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);    // Reserved (0)
    header.writeUInt16LE(1, 2);    // Type (1 = ICO)
    header.writeUInt16LE(1, 4);    // Number of images
    
    // ICOディレクトリエントリ (16バイト)
    const directory = Buffer.alloc(16);
    directory.writeUInt8(0, 0);    // Width (0 = 256)
    directory.writeUInt8(0, 1);    // Height (0 = 256)
    directory.writeUInt8(0, 2);    // Color count (0 = no palette)
    directory.writeUInt8(0, 3);    // Reserved
    directory.writeUInt16LE(1, 4); // Color planes
    directory.writeUInt16LE(32, 6); // Bits per pixel
    directory.writeUInt32LE(pngData.length, 8); // Image data size
    directory.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)
    
    // ICOファイル作成
    const icoData = Buffer.concat([header, directory, pngData]);
    fs.writeFileSync(icoPath, icoData);
    
    return true;
  } catch (error) {
    console.error('ICOファイル作成エラー:', error.message);
    return false;
  }
}

// ICOファイル作成スクリプト
console.log('ICOファイル作成スクリプト');

const pngPath = path.join(__dirname, 'assets', 'bf-copy-icon-256.png');
const icoPath = path.join(__dirname, 'assets', 'icon.ico');

if (fs.existsSync(pngPath)) {
  console.log('✓ 元となるPNGファイルが見つかりました:', pngPath);
  
  if (createIcoFromPng(pngPath, icoPath)) {
    console.log('✓ ICOファイルが作成されました:', icoPath);
    console.log('');
    console.log('package.jsonのアイコン設定を更新してください:');
    console.log('"icon": "assets/icon.ico"');
  } else {
    console.log('✗ ICOファイルの作成に失敗しました');
    console.log('');
    console.log('代替方法:');
    console.log('1. オンラインコンバーター: https://convertio.co/png-ico/');
    console.log('2. ImageMagick: magick convert assets/bf-copy-icon-256.png assets/icon.ico');
  }
} else {
  console.log('✗ PNGファイルが見つかりません:', pngPath);
}