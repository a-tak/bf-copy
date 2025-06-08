class SigmaBFCopy {
    constructor() {
        this.config = null;
        this.selectedFolder = null;
        this.cameraInfo = null;
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.setupEventListeners();
        this.setupCopyProgressListener();
        this.setupTrayListeners();
        // this.restoreFolderName(); // 無効化：イベント干渉の可能性
        
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
            progressDetails.textContent = `${progressData.fileName} (${progressData.current}/${progressData.total})`;
        }
    }

    async loadConfig() {
        this.config = await window.electronAPI.loadConfig();
        console.log('設定読み込み:', this.config);
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
        

        // 設定モーダル
        document.getElementById('settings-select-photo').addEventListener('click', () => this.selectFolder('settings-photo-dest'));
        document.getElementById('settings-select-video').addEventListener('click', () => this.selectFolder('settings-video-dest'));
        document.getElementById('cancel-settings').addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

    }

    // restoreFolderName() {
    //     // フィールド名復元機能を無効化
    //     // イベント干渉の可能性があるため一時的に無効化
    //     console.log('フォルダ名復元機能は無効化されています');
    // }


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
            alert('写真と動画のコピー先フォルダを両方選択してください');
            return;
        }

        this.config = {
            photoDestination,
            videoDestination,
            isFirstRun: false,
            lastFolderName: ''
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
        document.getElementById('folder-selection').classList.add('hidden');
        document.getElementById('copy-settings').classList.add('hidden');
    }

    showCameraDetected(cameraInfo) {
        document.getElementById('camera-not-detected').classList.add('hidden');
        document.getElementById('camera-detected').classList.remove('hidden');
        document.getElementById('camera-info').textContent = cameraInfo;
        
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
                document.getElementById('folder-selection').classList.remove('hidden');
            } else {
                console.log('カメラにフォルダが見つかりませんでした');
                // フォルダが見つからない場合の処理
                document.getElementById('folder-selection').classList.add('hidden');
            }
        } catch (error) {
            console.error('カメラフォルダ読み込みエラー:', error);
        }
    }

    displayFolderList(folders) {
        const container = document.getElementById('camera-folders');
        container.innerHTML = '';

        folders.forEach(folder => {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder-item';
            folderElement.innerHTML = `
                <div class="folder-info">
                    <h4>📁 ${folder.name}</h4>
                    <p>${folder.date} - ${folder.files} ファイル (${folder.size})</p>
                </div>
                <div class="folder-select">
                    <button>選択</button>
                </div>
            `;

            folderElement.addEventListener('click', () => this.selectCameraFolder(folder, folderElement));
            container.appendChild(folderElement);
        });
    }

    selectCameraFolder(folder, element) {
        // 既存の選択を解除
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 新しい選択をマーク
        element.classList.add('selected');
        this.selectedFolder = folder;

        // コピー設定セクションを表示
        document.getElementById('copy-settings').classList.remove('hidden');
        
        console.log('選択されたフォルダ:', folder);
    }

    async startCopy() {
        const folderName = document.getElementById('folder-name').value.trim();
        
        if (!folderName) {
            alert('フォルダ名を入力してください');
            return;
        }

        if (!this.selectedFolder) {
            alert('コピーするフォルダを選択してください');
            return;
        }

        // フォルダ名を設定に保存
        this.config.lastFolderName = folderName;
        await this.saveConfig();

        // 進行状況セクションを表示
        document.getElementById('progress-section').classList.remove('hidden');
        
        try {
            console.log('コピー開始:', {
                sourceFolderPath: this.selectedFolder.path,
                folderName: folderName,
                photoDestination: this.config.photoDestination,
                videoDestination: this.config.videoDestination
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
                folderName
            );

            console.log('コピー結果:', result);

            if (result.success) {
                alert(`コピーが完了しました！\n\n写真: ${result.copiedPhotos}ファイル\n動画: ${result.copiedVideos}ファイル\n\n写真: ${result.photoDestPath}\n動画: ${result.videoDestPath}`);
            } else {
                alert(`コピーに失敗しました: ${result.message}`);
            }
        } catch (error) {
            console.error('コピーエラー:', error);
            alert(`コピー中にエラーが発生しました: ${error.message}`);
        }
    }


    showSettingsModal() {
        document.getElementById('settings-photo-dest').value = this.config.photoDestination;
        document.getElementById('settings-video-dest').value = this.config.videoDestination;
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    hideSettingsModal() {
        document.getElementById('settings-modal').classList.add('hidden');
        // this.restoreFolderName(); // 無効化：イベント干渉の可能性
        
    }

    async saveSettings() {
        const photoDestination = document.getElementById('settings-photo-dest').value;
        const videoDestination = document.getElementById('settings-video-dest').value;

        if (!photoDestination || !videoDestination) {
            alert('写真と動画のコピー先フォルダを両方選択してください');
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
        const result = confirm(
            'Sigma BF Copy を Windows 起動時に自動で開始しますか？\n\n' +
            'カメラが接続されたときに素早くファイルをコピーできるようになります。\n' +
            '自動起動を有効にする場合は「OK」を、無効にする場合は「キャンセル」を選択してください。'
        );
        
        if (result) {
            window.electronAPI.setAutoStart(true);
            alert('自動起動が有効になりました。次回からWindows起動時にアプリが自動で開始されます。');
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new SigmaBFCopy();
});