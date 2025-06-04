class SigmaBFCopy {
    constructor() {
        this.config = null;
        this.selectedFolder = null;
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.setupEventListeners();
        
        if (!this.config || this.config.isFirstRun !== false) {
            this.showInitialSetup();
        } else {
            this.showMainContent();
            this.updateCurrentSettings();
            this.startCameraDetection();
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

        // フォルダ名の前回値復元
        const folderNameInput = document.getElementById('folder-name');
        if (this.config && this.config.lastFolderName) {
            folderNameInput.value = this.config.lastFolderName;
        }
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
        
        // TODO: 実際のカメラ検知ロジックを実装
        // 現在はテスト用の動作
        setTimeout(() => {
            // テスト用: カメラが見つからない状態をシミュレート
            this.showCameraNotDetected();
        }, 1000);
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
        // TODO: カメラのDCIMフォルダからフォルダリストを取得
        console.log('カメラフォルダ読み込み...');
        
        // テスト用のフォルダリスト
        const testFolders = [
            { name: '250518_0', files: 45, date: '2025-05-18' },
            { name: '250517_0', files: 32, date: '2025-05-17' },
            { name: '250516_0', files: 28, date: '2025-05-16' }
        ];
        
        this.displayFolderList(testFolders);
        document.getElementById('folder-selection').classList.remove('hidden');
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
                    <p>${folder.date} - ${folder.files} ファイル</p>
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
        
        // TODO: 実際のファイルコピー処理を実装
        console.log('コピー開始:', {
            sourceFolder: this.selectedFolder.name,
            folderName: folderName,
            photoDestination: this.config.photoDestination,
            videoDestination: this.config.videoDestination
        });

        // テスト用の進行状況シミュレート
        this.simulateProgress();
    }

    simulateProgress() {
        let progress = 0;
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressDetails = document.getElementById('progress-details');

        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                progressDetails.textContent = 'コピー完了しました！';
            } else {
                progressDetails.textContent = `ファイルをコピー中... (${Math.floor(progress)}/${100})`;
            }

            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.floor(progress)}%`;
        }, 200);
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
            alert('写真と動画のコピー先フォルダを両方選択してください');
            return;
        }

        this.config.photoDestination = photoDestination;
        this.config.videoDestination = videoDestination;

        if (await this.saveConfig()) {
            this.updateCurrentSettings();
            this.hideSettingsModal();
            alert('設定を保存しました');
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new SigmaBFCopy();
});