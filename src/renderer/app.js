class SigmaBFCopy {
    constructor() {
        this.config = null;
        this.selectedFolder = null;
        this.cameraInfo = null;
        this.thumbnailLoadQueue = [];
        this.isThumbnailLoadingPaused = false;
        this.activeThumbnailLoads = 0;
        this.maxConcurrentThumbnailLoads = 2; // 同時読み込み数制限
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.initVersionDisplay();
        this.setupEventListeners();
        this.setupCopyProgressListener();
        this.setupTrayListeners();

        if (!this.config || this.config.isFirstRun !== false) {
            this.showInitialSetup();
        } else {
            this.showMainContent();
            this.updateCurrentSettings();
            this.startCameraDetection();
        }
    }

    setupCopyProgressListener() {
        window.electronAPI.onCopyProgress((event, progressData) => {
            this.updateProgress(progressData);
        });
    }

    setupTrayListeners() {
        // 自動起動確認ダイアログ
        window.electronAPI.onAskAutoStart(() => {
            this.showAutoStartDialog();
        });

        // トレイからのカメラ再検知
        window.electronAPI.onRefreshCamera(() => {
            this.startCameraDetection();
        });

        // カメラ接続イベント
        window.electronAPI.onCameraConnected((event, cameraInfo) => {
            console.log('カメラ接続イベントを受信:', cameraInfo);
            this.handleCameraConnected(cameraInfo);
        });
    }

    updateProgress(progressData) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressDetails = document.getElementById('progress-details');

        if (progressFill && progressText && progressDetails) {
            progressFill.style.width = `${progressData.percentage}%`;
            progressText.textContent = `${progressData.percentage}%`;

            // メッセージが指定されている場合（変換中など）はそれを表示、なければデフォルトメッセージ
            const statusMessage = progressData.message ||
                `${progressData.fileName} (${progressData.current}/${progressData.total})`;
            progressDetails.textContent = statusMessage;
        }
    }

    async loadConfig() {
        this.config = await window.electronAPI.loadConfig();
        if (this.config) {
            this.config.convertRw2ToDng = this.config.convertRw2ToDng === true;
        }
        console.log('設定読み込み:', this.config);
    }

    async initVersionDisplay() {
        try {
            const version = await window.electronAPI.getAppVersion();
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = `v${version}`;
            }
        } catch (error) {
            console.error('バージョン取得エラー:', error);
        }
    }

    async saveConfig() {
        const success = await window.electronAPI.saveConfig(this.config);
        if (!success) {
            alert('設定の保存に失敗しました');
        }
        return success;
    }

    setupEventListeners() {
        // 初回設定
        document.getElementById('select-photo-btn').addEventListener('click', () => this.selectFolder('photo-destination'));
        document.getElementById('select-video-btn').addEventListener('click', () => this.selectFolder('video-destination'));
        document.getElementById('save-initial-config').addEventListener('click', () => this.saveInitialConfig());

        // メイン画面
        document.getElementById('refresh-camera').addEventListener('click', () => this.startCameraDetection());
        document.getElementById('change-settings').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('start-copy').addEventListener('click', () => this.startCopy());
        document.getElementById('convert-rw2-to-dng').addEventListener('change', (event) => this.updateDngConversionOption(event.target.checked));


        // 設定モーダル
        document.getElementById('settings-select-photo').addEventListener('click', () => this.selectFolder('settings-photo-dest'));
        document.getElementById('settings-select-video').addEventListener('click', () => this.selectFolder('settings-video-dest'));
        document.getElementById('cancel-settings').addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

    }



    async selectFolder(inputId) {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
            document.getElementById(inputId).value = folderPath;
        }
    }

    async saveInitialConfig() {
        const photoDestination = document.getElementById('photo-destination').value;
        const videoDestination = document.getElementById('video-destination').value;

        if (!photoDestination || !videoDestination) {
            this.showNotification('error', 'エラー', '写真と動画のコピー先フォルダを両方選択してください');
            return;
        }

        this.config = {
            photoDestination,
            videoDestination,
            isFirstRun: false,
            convertRw2ToDng: false
        };

        if (await this.saveConfig()) {
            this.hideInitialSetup();
            this.showMainContent();
            this.updateCurrentSettings();
            this.startCameraDetection();
        }
    }

    showInitialSetup() {
        document.getElementById('initial-setup').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }

    hideInitialSetup() {
        document.getElementById('initial-setup').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('main-content').classList.remove('hidden');
    }

    updateCurrentSettings() {
        if (this.config) {
            document.getElementById('current-photo-dest').textContent = this.config.photoDestination;
            document.getElementById('current-video-dest').textContent = this.config.videoDestination;
            this.updateDngConversionDisplay();
        }
    }

    updateDngConversionDisplay() {
        const checkbox = document.getElementById('convert-rw2-to-dng');
        const status = document.getElementById('dng-conversion-status');
        const enabled = this.config ? this.config.convertRw2ToDng === true : false;

        if (checkbox) {
            checkbox.checked = enabled;
        }

        if (status) {
            status.textContent = `DNG変換: ${enabled ? 'ON' : 'OFF'}`;
            status.classList.toggle('off', !enabled);
        }
    }

    async updateDngConversionOption(enabled) {
        if (!this.config) {
            return;
        }

        this.config.convertRw2ToDng = enabled;
        this.updateDngConversionDisplay();

        if (await this.saveConfig()) {
            this.showNotification('success', 'オプション保存', `DNG変換を${enabled ? 'ON' : 'OFF'}にしました`);
        }
    }

    async startCameraDetection() {
        console.log('カメラ検知開始...');

        try {
            const cameraInfo = await window.electronAPI.detectSigmaCamera();

            if (cameraInfo) {
                console.log('Sigma BFカメラが見つかりました:', cameraInfo);
                this.cameraInfo = cameraInfo;
                this.showCameraDetected(`${cameraInfo.drive}:\\ - ${cameraInfo.label}`);
            } else {
                console.log('Sigma BFカメラが見つかりません');
                this.showCameraNotDetected();
            }
        } catch (error) {
            console.error('カメラ検知エラー:', error);
            this.showCameraNotDetected();
        }
    }

    showCameraNotDetected() {
        document.getElementById('camera-not-detected').classList.remove('hidden');
        document.getElementById('camera-detected').classList.add('hidden');
        document.getElementById('two-column-layout').classList.add('hidden');
        document.getElementById('copy-settings').classList.add('hidden');
    }

    showCameraDetected(cameraInfo) {
        document.getElementById('camera-not-detected').classList.add('hidden');
        document.getElementById('camera-detected').classList.remove('hidden');
        document.getElementById('camera-info').textContent = cameraInfo;

        // カメラ名に応じてタイトルを変更
        const titleElement = document.getElementById('camera-detected-title');
        if (titleElement && this.cameraInfo && this.cameraInfo.label) {
            const label = this.cameraInfo.label.toLowerCase();
            if (label.includes('lumix') || label.includes('gh7')) {
                titleElement.textContent = '✅ LUMIX カメラが見つかりました';
            } else if (label.includes('sigma') || label.includes('bf')) {
                titleElement.textContent = '✅ Sigma BF カメラが見つかりました';
            } else {
                titleElement.textContent = '✅ カメラが見つかりました';
            }
        }

        this.loadCameraFolders();
    }

    async loadCameraFolders() {
        console.log('カメラフォルダ読み込み...');
        console.log('this.cameraInfo:', this.cameraInfo);

        if (!this.cameraInfo) {
            console.error('カメラ情報がありません');
            return;
        }

        try {
            const folders = await window.electronAPI.getCameraFolders(this.cameraInfo.path);

            if (folders.length > 0) {
                console.log('カメラフォルダ一覧:', folders);
                this.displayFolderList(folders);
                document.getElementById('two-column-layout').classList.remove('hidden');
            } else {
                console.log('カメラにフォルダが見つかりませんでした');
                // フォルダが見つからない場合の処理
                document.getElementById('two-column-layout').classList.add('hidden');
            }
        } catch (error) {
            console.error('カメラフォルダ読み込みエラー:', error);
        }
    }

    async displayFolderList(folders) {
        const container = document.getElementById('camera-folders');
        container.innerHTML = '';

        // キューをクリア
        this.thumbnailLoadQueue = [];

        for (const folder of folders) {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder-item';

            // サムネイル取得を試行
            let thumbnailsHtml = '<div class="thumbnails-loading">📷 読み込み中...</div>';

            folderElement.innerHTML = `
                <div class="folder-info">
                    <h4>📁 ${folder.name}</h4>
                    <p>${folder.date} - ${folder.files} ファイル (${folder.size})</p>
                </div>
                <div class="folder-thumbnails">
                    ${thumbnailsHtml}
                </div>
            `;

            folderElement.addEventListener('click', () => this.selectCameraFolder(folder, folderElement));
            container.appendChild(folderElement);

            // サムネイル読み込みをキューに追加
            this.queueThumbnailLoad(folder.path, folderElement);
        }
    }

    queueThumbnailLoad(folderPath, folderElement) {
        // キューに追加
        this.thumbnailLoadQueue.push({ folderPath, folderElement });

        // キュー処理を開始
        this.processThumnailQueue();
    }

    async processThumnailQueue() {
        // 既に最大同時実行数に達している場合はスキップ
        if (this.activeThumbnailLoads >= this.maxConcurrentThumbnailLoads) {
            return;
        }

        // 一時停止中の場合はスキップ
        if (this.isThumbnailLoadingPaused) {
            return;
        }

        // キューが空の場合は終了
        if (this.thumbnailLoadQueue.length === 0) {
            return;
        }

        // キューから次のタスクを取り出す
        const task = this.thumbnailLoadQueue.shift();
        this.activeThumbnailLoads++;

        try {
            await this.loadFolderThumbnails(task.folderPath, task.folderElement);
        } catch (error) {
            console.error('サムネイル読み込みエラー:', error);
        } finally {
            this.activeThumbnailLoads--;

            // 次のタスクを処理
            this.processThumnailQueue();
        }
    }

    async loadFolderThumbnails(folderPath, folderElement) {
        try {
            const thumbnails = await window.electronAPI.getFolderThumbnails(folderPath);
            const thumbnailContainer = folderElement.querySelector('.folder-thumbnails');

            if (thumbnails.length > 0) {
                thumbnailContainer.innerHTML = thumbnails.map((thumbnail, index) =>
                    `<img src="${thumbnail.base64Data}" 
                          alt="${thumbnail.fileName}" 
                          class="thumbnail" 
                          title="${thumbnail.fileName}"
                          data-thumbnail-index="${index}"
                          data-folder-path="${folderPath}">`
                ).join('');

                // サムネイルクリックイベントを追加
                this.addThumbnailClickEvents(thumbnailContainer, thumbnails, folderPath);
            } else {
                thumbnailContainer.innerHTML = '<div class="no-thumbnails">📷 JPEG画像なし</div>';
            }
        } catch (error) {
            console.error('サムネイル読み込みエラー:', error);
            const thumbnailContainer = folderElement.querySelector('.folder-thumbnails');
            thumbnailContainer.innerHTML = '<div class="thumbnails-error">📷 読み込み失敗</div>';
        }
    }

    selectCameraFolder(folder, element) {
        // 既存の選択を解除
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 新しい選択をマーク
        element.classList.add('selected');
        this.selectedFolder = folder;

        // プレースホルダーを非表示にしてコピー設定セクションを表示
        document.getElementById('no-folder-selected').classList.add('hidden');
        document.getElementById('copy-settings').classList.remove('hidden');

        console.log('選択されたフォルダ:', folder);
    }

    async startCopy() {
        const folderName = document.getElementById('folder-name').value.trim();

        if (!folderName) {
            this.showNotification('error', 'エラー', 'フォルダ名を入力してください');
            // フォルダ名フィールドにフォーカスを当てる
            setTimeout(() => {
                document.getElementById('folder-name').focus();
            }, 100);
            return;
        }

        if (!this.selectedFolder) {
            this.showNotification('error', 'エラー', 'コピーするフォルダを選択してください');
            return;
        }

        // サムネイル読み込みを一時停止してコピー処理を優先
        this.pauseThumbnailLoading();

        // 進行状況セクションを表示
        document.getElementById('progress-section').classList.remove('hidden');

        try {
            // カメラ名からサブフォルダ名（BFまたはGH7）を決定
            let subFolderName = 'BF';
            if (this.cameraInfo && this.cameraInfo.label &&
                (this.cameraInfo.label.toLowerCase().includes('lumix') || this.cameraInfo.label.toLowerCase().includes('gh7'))) {
                subFolderName = 'GH7';
            }

            console.log('コピー開始:', {
                sourceFolderPath: this.selectedFolder.path,
                folderName: folderName,
                photoDestination: this.config.photoDestination,
                videoDestination: this.config.videoDestination,
                subFolderName: subFolderName,
                convertRw2ToDng: this.config.convertRw2ToDng === true
            });

            console.log('呼び出しパラメータ:', {
                sourceFolderPath: this.selectedFolder.path,
                photoDestination: this.config.photoDestination,
                videoDestination: this.config.videoDestination,
                folderName: folderName
            });

            const result = await window.electronAPI.copyFiles(
                this.selectedFolder.path,
                this.config.photoDestination,
                this.config.videoDestination,
                folderName,
                subFolderName,
                { convertRw2ToDng: this.config.convertRw2ToDng === true }
            );

            console.log('コピー結果:', result);

            if (result.success) {
                // alert削除：フォーカス問題の原因
                console.log(`コピーが完了しました！写真: ${result.copiedPhotos}ファイル, 動画: ${result.copiedVideos}ファイル`);
                console.log(`写真: ${result.photoDestPath}`);
                console.log(`動画: ${result.videoDestPath}`);

                // 差分コピーの結果に応じてメッセージを分岐
                if (result.alreadyExists && (result.skippedPhotos > 0 || result.skippedVideos > 0)) {
                    // 差分コピーの場合
                    let message = `差分コピーが完了しました\n\n`;
                    message += `新規コピー: 写真 ${result.copiedPhotos}ファイル, 動画 ${result.copiedVideos}ファイル\n`;
                    message += `スキップ: 写真 ${result.skippedPhotos}ファイル, 動画 ${result.skippedVideos}ファイル`;

                    this.showNotification('success', '差分コピー完了', message);
                } else {
                    // 通常のコピーの場合
                    this.showNotification('success', 'コピー完了', `写真: ${result.copiedPhotos}ファイル, 動画: ${result.copiedVideos}ファイルのコピーが完了しました`);
                }
            } else {
                console.error(`コピーに失敗しました: ${result.message}`);

                // 上書き防止エラーの場合は専用メッセージを表示（後方互換性のため保持）
                if (result.overwritePrevented) {
                    this.showNotification(
                        'error',
                        '上書き禁止',
                        `既存のフォルダが検出されました。\n${result.conflictPath}\n\nコピーを中止しました。`
                    );
                } else {
                    this.showNotification('error', 'コピーエラー', `コピーに失敗しました: ${result.message}`);
                }
            }
        } catch (error) {
            console.error('コピーエラー:', error);
            console.error(`コピー中にエラーが発生しました: ${error.message}`);
            this.showNotification('error', 'コピーエラー', `コピー中にエラーが発生しました: ${error.message}`);
        } finally {
            // コピー完了後、サムネイル読み込みを再開
            this.resumeThumbnailLoading();
        }
    }

    pauseThumbnailLoading() {
        console.log('サムネイル読み込みを一時停止（コピー処理優先）');
        this.isThumbnailLoadingPaused = true;
    }

    resumeThumbnailLoading() {
        console.log('サムネイル読み込みを再開');
        this.isThumbnailLoadingPaused = false;

        // キューに残っているタスクがあれば処理を再開
        if (this.thumbnailLoadQueue.length > 0) {
            this.processThumnailQueue();
        }
    }


    showSettingsModal() {
        document.getElementById('settings-photo-dest').value = this.config.photoDestination;
        document.getElementById('settings-video-dest').value = this.config.videoDestination;
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    hideSettingsModal() {
        document.getElementById('settings-modal').classList.add('hidden');
    }

    async saveSettings() {
        const photoDestination = document.getElementById('settings-photo-dest').value;
        const videoDestination = document.getElementById('settings-video-dest').value;

        if (!photoDestination || !videoDestination) {
            this.showNotification('error', 'エラー', '写真と動画のコピー先フォルダを両方選択してください');
            return;
        }

        this.config.photoDestination = photoDestination;
        this.config.videoDestination = videoDestination;

        if (await this.saveConfig()) {
            this.updateCurrentSettings();
            this.hideSettingsModal();
            // alert('設定を保存しました'); // アラート削除：フォーカス問題の原因
            console.log('設定を保存しました');
        }
    }

    handleCameraConnected(cameraInfo) {
        // カメラ情報を更新
        this.cameraInfo = cameraInfo;

        // カメラ検知状態を表示
        this.showCameraDetected(`${cameraInfo.drive}:\\ - ${cameraInfo.label}`);

        // 通知メッセージを表示（オプション）
        console.log('Sigma BFカメラが接続されました。ウィンドウをアクティブ化しています。');
    }

    showAutoStartDialog() {
        // フォーカス干渉を回避するため、alert/confirmの代わりに通知システムを使用
        this.showNotification(
            'info',
            '自動起動設定',
            'BF Copy を Windows 起動時に自動で開始しますか？カメラが接続されたときに素早くファイルをコピーできるようになります。',
            [
                {
                    text: 'はい',
                    action: async () => {
                        const result = await window.electronAPI.setAutoStart(true);
                        if (result.success) {
                            if (result.wasAlreadySet) {
                                this.showNotification('info', '既に設定済み', '自動起動は既に有効になっています。');
                            } else {
                                this.showNotification('success', '設定完了', '自動起動が有効になりました。次回からWindows起動時にアプリが自動で開始されます。');
                            }
                        } else {
                            this.showNotification('error', '設定エラー', `自動起動の設定に失敗しました: ${result.message}`);
                        }
                    }
                },
                {
                    text: 'いいえ',
                    action: () => {
                        console.log('自動起動設定をキャンセルしました');
                    }
                }
            ]
        );
    }

    // 通知システム（フォーカス干渉を回避するためのalert/confirm代替）
    showNotification(type, title, message, actions = null) {
        const container = document.getElementById('notification-container');
        if (!container) {
            console.error('通知コンテナが見つかりません');
            return;
        }

        const notificationId = 'notification-' + Date.now();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = notificationId;

        let actionsHtml = '';
        if (actions && actions.length > 0) {
            actionsHtml = `
                <div class="notification-actions">
                    ${actions.map((action, index) =>
                `<button onclick="window.currentApp.handleNotificationAction('${notificationId}', ${index})">${action.text}</button>`
            ).join('')}
                </div>
            `;
        }

        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">${title}</div>
                <button class="notification-close" onclick="window.currentApp.hideNotification('${notificationId}')">&times;</button>
            </div>
            <div class="notification-body">${message}</div>
            ${actionsHtml}
        `;

        // アクション情報を保存
        if (actions) {
            notification._actions = actions;
        }

        container.appendChild(notification);

        // アニメーション表示
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // 自動非表示（アクションがない場合のみ）
        if (!actions) {
            setTimeout(() => {
                this.hideNotification(notificationId);
            }, 5000);
        }
    }

    hideNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    handleNotificationAction(notificationId, actionIndex) {
        const notification = document.getElementById(notificationId);
        if (notification && notification._actions && notification._actions[actionIndex]) {
            const action = notification._actions[actionIndex];
            if (action.action) {
                action.action();
            }
            this.hideNotification(notificationId);
        }
    }

    // 画像拡大表示機能
    addThumbnailClickEvents(container, thumbnails, folderPath) {
        const thumbnailImages = container.querySelectorAll('.thumbnail');

        thumbnailImages.forEach((img, index) => {
            img.addEventListener('click', () => {
                this.openImageModal(thumbnails, index, folderPath);
            });
        });
    }

    openImageModal(thumbnails, initialIndex, folderPath) {
        this.currentThumbnails = thumbnails;
        this.currentImageIndex = initialIndex;
        this.currentFolderPath = folderPath;

        const modal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        const imageFilename = document.getElementById('image-filename');
        const imageDetails = document.getElementById('image-details');
        const imageCounter = document.getElementById('image-counter');
        const prevButton = document.getElementById('prev-image');
        const nextButton = document.getElementById('next-image');

        // モーダルを表示
        modal.classList.remove('hidden');

        // 現在の画像を表示
        this.displayModalImage();

        // ナビゲーションボタンのイベントリスナーを設定
        if (!this.modalEventListenersAdded) {
            this.setupModalEventListeners();
            this.modalEventListenersAdded = true;
        }

        // 背景スクロールを無効化
        document.body.style.overflow = 'hidden';
    }

    displayModalImage() {
        const thumbnail = this.currentThumbnails[this.currentImageIndex];
        const modalImage = document.getElementById('modal-image');
        const imageFilename = document.getElementById('image-filename');
        const imageDetails = document.getElementById('image-details');
        const imageCounter = document.getElementById('image-counter');
        const prevButton = document.getElementById('prev-image');
        const nextButton = document.getElementById('next-image');
        const loadingSpinner = document.getElementById('image-loading');

        // ローディング表示
        loadingSpinner.classList.remove('hidden');
        modalImage.style.opacity = '0';

        // 画像情報を更新
        imageFilename.textContent = thumbnail.fileName;
        imageDetails.textContent = `${this.currentImageIndex + 1} / ${this.currentThumbnails.length}`;
        imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentThumbnails.length}`;

        // ナビゲーションボタンの状態を更新
        prevButton.disabled = this.currentImageIndex === 0;
        nextButton.disabled = this.currentImageIndex === this.currentThumbnails.length - 1;

        // まずサムネイル画像を即座に表示
        modalImage.src = thumbnail.base64Data;
        modalImage.alt = thumbnail.fileName;
        modalImage.style.opacity = '0.7'; // サムネイル表示時は少し薄く

        // フルサイズ画像を非同期で読み込み
        this.loadFullSizeImage(thumbnail.filePath, modalImage, loadingSpinner);

        // 画像読み込み失敗時の処理（サムネイル用）
        modalImage.onerror = () => {
            loadingSpinner.classList.add('hidden');
            modalImage.style.opacity = '1';
            console.error('画像の読み込みに失敗しました:', thumbnail.fileName);
        };
    }

    setupModalEventListeners() {
        const modal = document.getElementById('image-modal');
        const closeButton = document.getElementById('close-image-modal');
        const prevButton = document.getElementById('prev-image');
        const nextButton = document.getElementById('next-image');
        const overlay = modal.querySelector('.image-modal-overlay');

        // 閉じるボタン
        closeButton.addEventListener('click', () => {
            this.closeImageModal();
        });

        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeImageModal();
            }
        });

        // 前の画像ボタン
        prevButton.addEventListener('click', () => {
            this.showPreviousImage();
        });

        // 次の画像ボタン
        nextButton.addEventListener('click', () => {
            this.showNextImage();
        });

        // キーボードショートカット
        this.modalKeyboardHandler = (e) => {
            // モーダルが開いている時のみ処理
            if (!modal.classList.contains('hidden')) {
                switch (e.key) {
                    case 'Escape':
                        e.preventDefault();
                        this.closeImageModal();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.showPreviousImage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.showNextImage();
                        break;
                }
            }
        };

        document.addEventListener('keydown', this.modalKeyboardHandler);
    }

    closeImageModal() {
        const modal = document.getElementById('image-modal');
        modal.classList.add('hidden');

        // 背景スクロールを再有効化
        document.body.style.overflow = '';

        // キーボードイベントリスナーを削除
        if (this.modalKeyboardHandler) {
            document.removeEventListener('keydown', this.modalKeyboardHandler);
            this.modalKeyboardHandler = null;
        }

        // データをクリア
        this.currentThumbnails = null;
        this.currentImageIndex = 0;
        this.currentFolderPath = null;
    }

    showPreviousImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            this.displayModalImage();
        }
    }

    showNextImage() {
        if (this.currentImageIndex < this.currentThumbnails.length - 1) {
            this.currentImageIndex++;
            this.displayModalImage();
        }
    }

    async loadFullSizeImage(imagePath, modalImage, loadingSpinner) {
        try {
            console.log('フルサイズ画像読み込み開始:', imagePath);

            // フルサイズ画像を取得
            const fullSizeImageData = await window.electronAPI.getFullSizeImage(imagePath);

            // 新しい画像要素を作成して先読み
            const tempImage = new Image();

            tempImage.onload = () => {
                // フルサイズ画像の読み込みが完了したら置き換え
                modalImage.src = fullSizeImageData;
                modalImage.style.opacity = '1';
                loadingSpinner.classList.add('hidden');
                console.log('フルサイズ画像読み込み完了:', imagePath);
            };

            tempImage.onerror = () => {
                // フルサイズ画像の読み込みに失敗した場合はサムネイルのまま
                modalImage.style.opacity = '1';
                loadingSpinner.classList.add('hidden');
                console.error('フルサイズ画像読み込み失敗:', imagePath);
            };

            // 先読み開始
            tempImage.src = fullSizeImageData;

        } catch (error) {
            // API呼び出しに失敗した場合もサムネイルのまま
            modalImage.style.opacity = '1';
            loadingSpinner.classList.add('hidden');
            console.error('フルサイズ画像取得エラー:', error);
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    window.currentApp = new SigmaBFCopy();
});
