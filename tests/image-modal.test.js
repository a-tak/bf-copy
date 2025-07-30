/**
 * @jest-environment jsdom
 */

// DOM環境のセットアップ
const fs = require('fs');
const path = require('path');

describe('画像拡大表示モーダル機能', () => {
  let app;
  let mockThumbnails;

  beforeAll(() => {
    // HTMLファイルの読み込み
    const htmlPath = path.join(__dirname, '../src/renderer/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = html;

    // CSSファイルの読み込みをモック
    const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach(link => {
      const cssPath = path.join(__dirname, '../src/renderer', link.getAttribute('href'));
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf8');
        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
      }
    });

    // Electron API のモック
    global.window = window;
    window.electronAPI = {
      getFolderThumbnails: jest.fn()
    };

    // アプリケーションのセットアップ
    require('../src/renderer/app.js');
    app = window.currentApp;
  });

  beforeEach(() => {
    // モックデータのセットアップ
    mockThumbnails = [
      {
        fileName: 'BF_00001.JPG',
        filePath: '/mock/path/BF_00001.JPG',
        base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      },
      {
        fileName: 'BF_00002.JPG',
        filePath: '/mock/path/BF_00002.JPG',
        base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      },
      {
        fileName: 'BF_00003.JPG',
        filePath: '/mock/path/BF_00003.JPG',
        base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      }
    ];

    // モーダル要素の初期状態をリセット
    const modal = document.getElementById('image-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    
    // body のスタイルをリセット
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // イベントリスナーのクリーンアップ
    if (app && app.modalKeyboardHandler) {
      document.removeEventListener('keydown', app.modalKeyboardHandler);
      app.modalKeyboardHandler = null;
    }
  });

  describe('モーダル表示機能', () => {
    test('サムネイルクリックでモーダルが表示される', () => {
      // モーダルが初期状態で非表示であることを確認
      const modal = document.getElementById('image-modal');
      expect(modal.classList.contains('hidden')).toBe(true);

      // モーダルを開く
      app.openImageModal(mockThumbnails, 0, '/mock/path');

      // モーダルが表示されることを確認
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(document.body.style.overflow).toBe('hidden');
    });

    test('モーダル表示時に正しい画像情報が設定される', () => {
      app.openImageModal(mockThumbnails, 1, '/mock/path');

      const imageFilename = document.getElementById('image-filename');
      const imageCounter = document.getElementById('image-counter');
      
      expect(imageFilename.textContent).toBe('BF_00002.JPG');
      expect(imageCounter.textContent).toBe('2 / 3');
    });

    test('モーダル表示時にナビゲーションボタンの状態が正しく設定される', () => {
      // 最初の画像を表示
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      
      const prevButton = document.getElementById('prev-image');
      const nextButton = document.getElementById('next-image');
      
      expect(prevButton.disabled).toBe(true);
      expect(nextButton.disabled).toBe(false);

      // 最後の画像を表示
      app.openImageModal(mockThumbnails, 2, '/mock/path');
      
      expect(prevButton.disabled).toBe(false);
      expect(nextButton.disabled).toBe(true);
    });
  });

  describe('モーダル閉じる機能', () => {
    test('閉じるボタンクリックでモーダルが閉じる', () => {
      // モーダルを開く
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      const modal = document.getElementById('image-modal');
      expect(modal.classList.contains('hidden')).toBe(false);

      // 閉じるボタンをクリック
      const closeButton = document.getElementById('close-image-modal');
      closeButton.click();

      // モーダルが閉じることを確認
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(document.body.style.overflow).toBe('');
    });

    test('オーバーレイクリックでモーダルが閉じる', () => {
      // モーダルを開く
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      const modal = document.getElementById('image-modal');
      expect(modal.classList.contains('hidden')).toBe(false);

      // オーバーレイをクリック
      const overlay = modal.querySelector('.image-modal-overlay');
      const clickEvent = new MouseEvent('click', { target: overlay });
      Object.defineProperty(clickEvent, 'target', { value: overlay });
      overlay.dispatchEvent(clickEvent);

      // モーダルが閉じることを確認
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('モーダル閉じる時にデータがクリアされる', () => {
      // モーダルを開く
      app.openImageModal(mockThumbnails, 1, '/mock/path');
      
      // データが設定されることを確認
      expect(app.currentThumbnails).toEqual(mockThumbnails);
      expect(app.currentImageIndex).toBe(1);
      expect(app.currentFolderPath).toBe('/mock/path');

      // モーダルを閉じる
      app.closeImageModal();

      // データがクリアされることを確認
      expect(app.currentThumbnails).toBeNull();
      expect(app.currentImageIndex).toBe(0);
      expect(app.currentFolderPath).toBeNull();
    });
  });

  describe('画像ナビゲーション機能', () => {
    test('次の画像ボタンで画像が切り替わる', () => {
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      
      const nextButton = document.getElementById('next-image');
      const imageCounter = document.getElementById('image-counter');
      
      // 初期状態を確認
      expect(imageCounter.textContent).toBe('1 / 3');
      
      // 次の画像ボタンをクリック
      nextButton.click();
      
      // 画像が切り替わることを確認
      expect(imageCounter.textContent).toBe('2 / 3');
      expect(app.currentImageIndex).toBe(1);
    });

    test('前の画像ボタンで画像が切り替わる', () => {
      app.openImageModal(mockThumbnails, 2, '/mock/path');
      
      const prevButton = document.getElementById('prev-image');
      const imageCounter = document.getElementById('image-counter');
      
      // 初期状態を確認
      expect(imageCounter.textContent).toBe('3 / 3');
      
      // 前の画像ボタンをクリック
      prevButton.click();
      
      // 画像が切り替わることを確認
      expect(imageCounter.textContent).toBe('2 / 3');
      expect(app.currentImageIndex).toBe(1);
    });

    test('最初の画像で前のボタンが無効になる', () => {
      app.openImageModal(mockThumbnails, 0, '/mock/path');

      const prevButton = document.getElementById('prev-image');
      expect(prevButton.disabled).toBe(true);

      // 前の画像ボタンをクリックしても変わらない
      prevButton.click();
      expect(app.currentImageIndex).toBe(0);
    });

    test('最後の画像で次のボタンが無効になる', () => {
      app.openImageModal(mockThumbnails, 2, '/mock/path');

      const nextButton = document.getElementById('next-image');
      expect(nextButton.disabled).toBe(true);

      // 次の画像ボタンをクリックしても変わらない
      nextButton.click();
      expect(app.currentImageIndex).toBe(2);
    });
  });

  describe('キーボードショートカット機能', () => {
    test('ESCキーでモーダルが閉じる', () => {
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      const modal = document.getElementById('image-modal');
      expect(modal.classList.contains('hidden')).toBe(false);

      // ESCキーを押下
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      // モーダルが閉じることを確認
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('右矢印キーで次の画像に切り替わる', () => {
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      
      // 右矢印キーを押下
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      document.dispatchEvent(rightArrowEvent);

      // 次の画像に切り替わることを確認
      expect(app.currentImageIndex).toBe(1);
    });

    test('左矢印キーで前の画像に切り替わる', () => {
      app.openImageModal(mockThumbnails, 1, '/mock/path');
      
      // 左矢印キーを押下
      const leftArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      document.dispatchEvent(leftArrowEvent);

      // 前の画像に切り替わることを確認
      expect(app.currentImageIndex).toBe(0);
    });

    test('モーダルが閉じている時はキーボードショートカットが無効', () => {
      // モーダルが閉じている状態で ESCキーを押下
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      // 何も起こらないことを確認（エラーが発生しない）
      expect(app.currentThumbnails).toBeNull();
    });
  });

  describe('サムネイルクリックイベント', () => {
    test('サムネイル要素にクリックイベントが追加される', () => {
      // サムネイルコンテナを作成
      const container = document.createElement('div');
      container.innerHTML = mockThumbnails.map((thumbnail, index) => 
        `<img src="${thumbnail.base64Data}" 
              alt="${thumbnail.fileName}" 
              class="thumbnail" 
              title="${thumbnail.fileName}"
              data-thumbnail-index="${index}"
              data-folder-path="/mock/path">`
      ).join('');

      // クリックイベントを追加
      app.addThumbnailClickEvents(container, mockThumbnails, '/mock/path');

      // 最初のサムネイルをクリック
      const firstThumbnail = container.querySelector('.thumbnail');
      firstThumbnail.click();

      // モーダルが開くことを確認
      const modal = document.getElementById('image-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(app.currentImageIndex).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    test('画像読み込み失敗時の処理', () => {
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      
      const modalImage = document.getElementById('modal-image');
      const loadingSpinner = document.getElementById('image-loading');
      
      // 初期状態でローディングが表示される
      expect(loadingSpinner.classList.contains('hidden')).toBe(false);
      
      // 画像読み込み失敗をシミュレート
      const errorEvent = new Event('error');
      modalImage.dispatchEvent(errorEvent);
      
      // ローディングが非表示になる
      expect(loadingSpinner.classList.contains('hidden')).toBe(true);
    });

    test('画像読み込み成功時の処理', () => {
      app.openImageModal(mockThumbnails, 0, '/mock/path');
      
      const modalImage = document.getElementById('modal-image');
      const loadingSpinner = document.getElementById('image-loading');
      
      // 画像読み込み成功をシミュレート
      const loadEvent = new Event('load');
      modalImage.dispatchEvent(loadEvent);
      
      // ローディングが非表示になり、画像が表示される
      expect(loadingSpinner.classList.contains('hidden')).toBe(true);
      expect(modalImage.style.opacity).toBe('1');
    });
  });
});