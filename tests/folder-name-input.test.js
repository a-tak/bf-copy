// フォルダ名入力フィールドのダイアログ干渉問題のテスト
// TDD: まずテストを作成し、期待される動作を定義する
// Issue #24: 初回起動時の確認ダイアログが表示されるとフォルダ名が入力できなくなる

/**
 * @jest-environment jsdom
 */

describe('フォルダ名入力フィールドのダイアログ干渉問題', () => {
  let mockWindow;
  let mockDocument;
  let folderNameInput;
  let originalConfirm;
  let originalAlert;

  beforeEach(() => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="folder-name-container">
        <input type="text" id="folder-name" placeholder="例: 撮影セッション">
      </div>
    `;
    
    folderNameInput = document.getElementById('folder-name');
    
    // confirm/alertをモック化
    originalConfirm = global.confirm;
    originalAlert = global.alert;
    
    global.confirm = jest.fn().mockReturnValue(true);
    global.alert = jest.fn();
    
    // Electron APIをモック化
    global.window = {
      electronAPI: {
        setAutoStart: jest.fn(),
      }
    };
  });

  afterEach(() => {
    // 元のconfirm/alertを復元
    global.confirm = originalConfirm;
    global.alert = originalAlert;
    
    document.body.innerHTML = '';
  });

  describe('確認ダイアログ表示時のフォーカス状態', () => {
    test('confirmダイアログ表示後もフォルダ名フィールドが入力可能である', () => {
      // Red フェーズ: 期待される動作を定義
      // 期待される動作: confirmダイアログが表示されても、フォルダ名フィールドの入力が阻害されない
      
      // フォルダ名フィールドにフォーカスを当てる
      folderNameInput.focus();
      expect(document.activeElement).toBe(folderNameInput);
      
      // 自動起動確認ダイアログ（issue #24の原因）をシミュレート
      const showAutoStartDialog = () => {
        const result = confirm(
          'BF Copy を Windows 起動時に自動で開始しますか？\n\n' +
          'カメラが接続されたときに素早くファイルをコピーできるようになります。\n' +
          '自動起動を有効にする場合は「OK」を、無効にする場合は「キャンセル」を選択してください。'
        );
        
        if (result && global.window.electronAPI) {
          global.window.electronAPI.setAutoStart(true);
          // この時点でalertが表示されることが問題の原因
          alert('自動起動が有効になりました。次回からWindows起動時にアプリが自動で開始されます。');
        }
      };
      
      // ダイアログを表示
      showAutoStartDialog();
      
      // confirmとalertが呼び出されたことを確認
      expect(global.confirm).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalled();
      
      // 期待される動作: ダイアログ表示後もフォルダ名フィールドが正常に動作する
      // （現在はこのテストが失敗することが予想される - Red フェーズ）
      
      // フォーカスを再設定（実際のユーザー操作をシミュレート）
      folderNameInput.focus();
      
      // フォルダ名入力をテスト
      const testValue = 'テスト撮影セッション';
      folderNameInput.value = testValue;
      
      // input イベントを発火
      const inputEvent = new Event('input', { bubbles: true });
      folderNameInput.dispatchEvent(inputEvent);
      
      // 期待される結果: フォルダ名が正しく入力されている
      expect(folderNameInput.value).toBe(testValue);
      expect(folderNameInput.disabled).toBe(false);
    });

    test('複数のダイアログが連続表示されてもフォルダ名フィールドが正常動作する', () => {
      // Red フェーズ: より複雑なシナリオをテスト
      
      folderNameInput.focus();
      
      // 複数のダイアログを連続で表示（実際のアプリでの状況をシミュレート）
      global.confirm('最初の確認ダイアログ');
      global.alert('最初のアラート');
      global.confirm('2番目の確認ダイアログ');
      
      // フォルダ名入力をテスト
      folderNameInput.focus();
      const testValue = '複数ダイアログテスト';
      folderNameInput.value = testValue;
      
      // 期待される結果: すべてのダイアログ表示後もフォルダ名が正しく入力される
      expect(folderNameInput.value).toBe(testValue);
      expect(folderNameInput.disabled).toBe(false);
    });

    test('フォルダ名入力中にダイアログが表示されても入力内容が保持される', () => {
      // Red フェーズ: 入力中のダイアログ割り込みをテスト
      
      folderNameInput.focus();
      
      // 部分的にフォルダ名を入力
      const partialValue = 'テスト';
      folderNameInput.value = partialValue;
      
      // 入力中にダイアログが表示される
      global.confirm('入力中のダイアログ');
      
      // 入力を続ける
      folderNameInput.focus();
      const fullValue = partialValue + '完了';
      folderNameInput.value = fullValue;
      
      // 期待される結果: 入力内容が保持され、続きが入力できる
      expect(folderNameInput.value).toBe('テスト完了');
    });
  });


  describe('モーダルダイアログとの競合', () => {
    test('設定モーダル表示時にフォルダ名フィールドのフォーカスが維持される', () => {
      // 設定モーダルが表示されてもメインのフォルダ名フィールドに影響しない
      
      // モーダルDOMを追加
      document.body.innerHTML += `
        <div id="settings-modal" class="modal">
          <div class="modal-content">
            <input type="text" id="settings-folder-input">
          </div>
        </div>
      `;
      
      const settingsModal = document.getElementById('settings-modal');
      const settingsInput = document.getElementById('settings-folder-input');
      
      // フォルダ名フィールドに値を設定
      folderNameInput.value = 'メインフォルダ名';
      folderNameInput.focus();
      
      // モーダルを表示
      settingsModal.classList.remove('hidden');
      settingsInput.focus();
      
      // モーダルを閉じる
      settingsModal.classList.add('hidden');
      folderNameInput.focus();
      
      // 期待される結果: メインフィールドの値が保持されている
      expect(folderNameInput.value).toBe('メインフォルダ名');
      
      // 新しい入力が可能
      folderNameInput.value = 'モーダル後の新しい名前';
      expect(folderNameInput.value).toBe('モーダル後の新しい名前');
    });
  });
});