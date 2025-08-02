# BF Copy - Windows用ビルドスクリプト（PowerShell版）
# 一発でビルドできる改良版

Write-Host "=== BF Copy 自動ビルド（Windows版）===" -ForegroundColor Green
Write-Host ""

# 1. 現在のバージョンを確認
Write-Host "1. 現在のバージョン確認..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Host "   現在のバージョン: $currentVersion" -ForegroundColor Cyan

# 2. バージョンをインクリメント
Write-Host "2. バージョンのインクリメント..." -ForegroundColor Yellow
$versionParts = $currentVersion.Split('.')
$versionParts[2] = [int]$versionParts[2] + 1
$newVersion = $versionParts -join '.'

# package.jsonを更新
$packageContent = Get-Content "package.json" -Raw
$packageContent = $packageContent -replace "`"version`": `"$currentVersion`"", "`"version`": `"$newVersion`""
$packageContent | Set-Content "package.json" -NoNewline

Write-Host "   バージョンを更新: $currentVersion → $newVersion" -ForegroundColor Green

# 3. 既存プロセスの終了
Write-Host "3. 既存プロセスの終了..." -ForegroundColor Yellow

# BF Copy関連プロセスを確実に終了
$bfProcesses = Get-Process | Where-Object { $_.ProcessName -like "*bf*" -or $_.MainWindowTitle -like "*BF Copy*" }
if ($bfProcesses) {
    Write-Host "   BF Copy関連プロセスを終了中..." -ForegroundColor Cyan
    $bfProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ BF Copy関連プロセスを終了しました" -ForegroundColor Green
}

# Electronプロセスを条件付きで終了（bf-copy関連のみ）
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    foreach ($proc in $electronProcesses) {
        try {
            $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            if ($commandLine -and ($commandLine -like "*bf-copy*" -or $commandLine -like "*BF Copy*")) {
                Write-Host "   BF Copy関連のElectronプロセス(PID: $($proc.Id))を終了中..." -ForegroundColor Cyan
                $proc | Stop-Process -Force -ErrorAction SilentlyContinue
                Write-Host "   ✓ Electronプロセス(PID: $($proc.Id))を終了しました" -ForegroundColor Green
            }
        }
        catch {
            # コマンドライン取得失敗は無視
        }
    }
}

# 少し待機
Start-Sleep -Seconds 2

# 4. ビルドファイルのクリーンアップ
Write-Host "4. ビルドファイルのクリーンアップ..." -ForegroundColor Yellow

if (Test-Path "dist") {
    try {
        Remove-Item -Path "dist" -Recurse -Force -ErrorAction Stop
        Write-Host "   ✓ distフォルダを削除しました" -ForegroundColor Green
    }
    catch {
        Write-Host "   ⚠ distフォルダの削除に失敗: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   手動でdistフォルダを削除してください" -ForegroundColor Yellow
    }
}
else {
    Write-Host "   distフォルダは存在しません" -ForegroundColor Cyan
}

# 5. Windows用ビルド実行
Write-Host "5. Windows用ビルド実行..." -ForegroundColor Yellow

try {
    # npm run pack を実行
    $buildProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run pack" -NoNewWindow -Wait -PassThru
    
    if ($buildProcess.ExitCode -eq 0) {
        Write-Host "   ✓ ビルドが正常に完了しました" -ForegroundColor Green
    }
    else {
        Write-Host "   ✗ ビルドが失敗しました (ExitCode: $($buildProcess.ExitCode))" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "   ✗ ビルド実行中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. ビルド結果の検証
Write-Host "6. ビルド結果の検証..." -ForegroundColor Yellow

$exePath = "dist\win-unpacked\BF Copy.exe"
if (Test-Path $exePath) {
    $fileInfo = Get-ItemProperty $exePath
    $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "   ✓ ビルド成功!" -ForegroundColor Green
    Write-Host "   ファイル: $exePath" -ForegroundColor Cyan
    Write-Host "   サイズ: ${fileSizeMB}MB" -ForegroundColor Cyan
    Write-Host "   更新日時: $($fileInfo.LastWriteTime)" -ForegroundColor Cyan
}
else {
    Write-Host "   ✗ 実行ファイルが見つかりません: $exePath" -ForegroundColor Red
    exit 1
}

# 7. バージョン変更の報告（自動コミットは無効）
Write-Host "7. バージョン変更の報告..." -ForegroundColor Yellow
Write-Host "   ⚠ package.jsonのバージョンが $currentVersion → $newVersion に変更されました" -ForegroundColor Yellow
Write-Host "   ⚠ 自動コミットは無効化されています。必要に応じて手動でコミットしてください。" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== ビルド完了 ===" -ForegroundColor Green
Write-Host "バージョン: $newVersion" -ForegroundColor Cyan
Write-Host "実行ファイル: $exePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "動作確認方法:" -ForegroundColor Yellow
Write-Host "1. '$exePath' をダブルクリックで実行" -ForegroundColor White
Write-Host "2. アプリケーションが正常に起動することを確認" -ForegroundColor White
Write-Host ""