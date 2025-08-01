/**
 * YouTube Theater Mode - ポップアップスクリプト
 * 拡張機能のポップアップUIの動作を制御
 */

document.addEventListener("DOMContentLoaded", () => {
  // UI要素の参照を取得
  const theaterModeToggle = document.getElementById("theaterModeToggle");
  const opacitySlider = document.getElementById("opacitySlider");
  const opacityValue = document.getElementById("opacityValue");
  const shortcutKey = document.getElementById("shortcutKey");
  const resetOpacityBtn = document.getElementById("resetOpacityBtn");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const previewOverlay = document.getElementById("previewOverlay");
  const shortcutKeyDisplay = document.getElementById("shortcutKeyDisplay");
  const connectionStatus = document.getElementById("connectionStatus");

  // 設定を読み込み
  loadSettings();

  // 接続状態を確認
  checkConnectionStatus();

  // イベントリスナー設定
  theaterModeToggle.addEventListener("change", handleTheaterModeToggle);
  opacitySlider.addEventListener("input", handleOpacityChange);
  shortcutKey.addEventListener("change", handleShortcutChange);

  // デフォルト透明度リセットボタンのイベントリスナー
  if (resetOpacityBtn) {
    resetOpacityBtn.addEventListener("click", resetToDefaultOpacity);
  }

  /**
   * 設定読み込み
   * バックグラウンドサービスから現在の設定を取得してUIに反映
   *
   * @function loadSettings
   */
  function loadSettings() {
    chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
      if (response) {
        // シアターモード状態を設定
        const isEnabled = response.theaterModeEnabled || false;
        theaterModeToggle.checked = isEnabled;
        updateStatusIndicator(isEnabled);

        // 透明度の設定（0-0.9の範囲）
        const opacity = response.opacity !== undefined ? response.opacity : 0.7;
        opacitySlider.value = opacity;
        updateOpacityDisplay(opacity);
        updateOpacityPreview(opacity);

        // ショートカットキーの設定
        const keyboardShortcut = response.keyboardShortcut || "t";
        shortcutKey.value = keyboardShortcut;
        updateShortcutDisplay(keyboardShortcut);

        console.log("設定を読み込みました:", response);
      } else {
        console.warn("設定の読み込みに失敗しました");
        // デフォルト値を使用
        updateOpacityDisplay(0.7);
        updateOpacityPreview(0.7);
        updateStatusIndicator(false);
        updateShortcutDisplay("t");
      }
    });
  }

  /**
   * 接続状態を確認
   * 現在のタブがYouTubeページかどうかを確認し、接続状態を表示
   *
   * @function checkConnectionStatus
   */
  function checkConnectionStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes("youtube.com")) {
        // YouTubeページが開かれている場合
        connectionStatus.textContent = "接続済み";
        connectionStatus.className = "connected";
      } else {
        // YouTubeページが開かれていない場合
        connectionStatus.textContent = "未接続 (YouTubeで開いてください)";
        connectionStatus.className = "disconnected";
      }
    });
  }

  /**
   * シアターモード切り替え
   */
  function handleTheaterModeToggle() {
    const isEnabled = theaterModeToggle.checked;

    // 状態表示を即座に更新（UXの向上）
    updateStatusIndicator(isEnabled);

    // まずバックグラウンドに状態変更を通知
    chrome.runtime.sendMessage({ action: "toggleTheaterMode" }, (response) => {
      if (response && response.success) {
        // バックグラウンドからの応答で状態を更新
        theaterModeToggle.checked = response.enabled;
        updateStatusIndicator(response.enabled);

        console.log(
          "シアターモード状態を変更しました:",
          response.enabled ? "有効" : "無効"
        );

        // 次にアクティブなタブに通知
        // 少し遅延を入れて確実に処理されるようにする
        setTimeout(() => {
          sendMessageToActiveTab({
            action: "toggleTheaterMode",
            enabled: response.enabled,
          });
        }, 100);
      } else {
        console.warn("シアターモード切り替えに失敗しました");
        // 失敗した場合は元の状態に戻す
        theaterModeToggle.checked = !isEnabled;
        updateStatusIndicator(!isEnabled);
      }
    });
  }

  /**
   * 透明度変更
   */
  function handleOpacityChange() {
    const opacity = parseFloat(opacitySlider.value);

    // 透明度を5%単位に丸める（0.05単位）
    const roundedOpacity = Math.round(opacity * 20) / 20;

    // UI表示を即座に更新
    updateOpacityDisplay(roundedOpacity);
    updateOpacityPreview(roundedOpacity);

    // 設定を保存
    chrome.runtime.sendMessage({
      action: "saveSettings",
      settings: { opacity: roundedOpacity },
    });

    // アクティブなタブに透明度変更を通知
    sendMessageToActiveTab({
      action: "updateOpacity",
      opacity: roundedOpacity,
    });

    console.log(
      "透明度を変更しました:",
      roundedOpacity,
      `(${Math.round(roundedOpacity * 100)}%)`
    );
  }

  /**
   * デフォルト透明度（70%）にリセット
   */
  function resetToDefaultOpacity() {
    const defaultOpacity = 0.7; // 70%

    // UI表示を更新
    opacitySlider.value = defaultOpacity;
    updateOpacityDisplay(defaultOpacity);
    updateOpacityPreview(defaultOpacity);

    // 設定を保存
    chrome.runtime.sendMessage({
      action: "saveSettings",
      settings: { opacity: defaultOpacity },
    });

    // アクティブなタブに透明度変更を通知
    sendMessageToActiveTab({
      action: "setDefaultOpacity",
      opacity: defaultOpacity,
    });

    // フィードバックを表示
    const feedbackEl = document.getElementById("opacityFeedback");
    if (feedbackEl) {
      feedbackEl.textContent = "デフォルト透明度に戻しました";
      feedbackEl.style.display = "block";
      setTimeout(() => {
        feedbackEl.style.display = "none";
      }, 2000);
    }

    console.log("透明度をデフォルト値にリセットしました");
  }

  /**
   * ショートカットキー変更
   */
  function handleShortcutChange() {
    const shortcut = shortcutKey.value;

    // UI表示を更新
    updateShortcutDisplay(shortcut);

    // 設定を保存
    chrome.runtime.sendMessage({
      action: "saveSettings",
      settings: { keyboardShortcut: shortcut },
    });

    // アクティブなタブにショートカット変更を通知
    sendMessageToActiveTab({ action: "updateShortcut", shortcut: shortcut });

    console.log("ショートカットキーを変更しました:", shortcut);
  }

  /**
   * 透明度表示更新
   */
  function updateOpacityDisplay(opacity) {
    // 小数点の透明度値をパーセントに変換（0-90%）
    const percentage = Math.round(opacity * 100);
    opacityValue.textContent = `${percentage}%`;

    // スライダーの値も更新（UIとの一貫性を保つ）
    if (opacitySlider.value != opacity) {
      opacitySlider.value = opacity;
    }
  }

  /**
   * 透明度プレビュー更新
   * 数値が高いほど透明になる動作を視覚的に表現
   */
  function updateOpacityPreview(opacity) {
    if (previewOverlay) {
      // 数値が高いほど透明になるように設定（実際の動作と一致）
      // 実際の動作では opacity の値が高いほど透明になる（1-opacity の値が不透明度になる）
      // プレビューでも同じ動作にするため、1-opacity を使用
      const invertedOpacity = 1 - opacity;
      previewOverlay.style.backgroundColor = `rgba(0, 0, 0, ${invertedOpacity})`;
    }
  }

  /**
   * ステータスインジケーター更新
   */
  function updateStatusIndicator(isEnabled) {
    if (statusIndicator && statusText) {
      if (isEnabled) {
        statusIndicator.classList.add("active");
        statusIndicator.classList.remove("inactive");
        statusText.textContent = "有効";
      } else {
        statusIndicator.classList.add("inactive");
        statusIndicator.classList.remove("active");
        statusText.textContent = "無効";
      }
    }
  }

  /**
   * ショートカット表示更新
   */
  function updateShortcutDisplay(shortcut) {
    if (shortcutKeyDisplay) {
      // ショートカットキーの表示名を設定
      let displayText = shortcut.toUpperCase();

      // 特殊キーの場合は表示名を変更
      if (shortcut === "space") {
        displayText = "スペース";
      }

      shortcutKeyDisplay.textContent = displayText;
    }
  }

  /**
   * アクティブなタブにメッセージ送信
   */
  function sendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com")) {
        // バックグラウンドスクリプトを経由してメッセージを送信
        // これにより、コンテンツスクリプトが読み込まれていない場合でもエラーを回避できる
        chrome.runtime.sendMessage(
          {
            action: "relayMessageToTab",
            tabId: tabs[0].id,
            message: message,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "バックグラウンド通信エラー:",
                chrome.runtime.lastError.message
              );
              connectionStatus.textContent = "通信エラー";
              connectionStatus.className = "disconnected";
              return;
            }

            if (response && response.success) {
              console.log("メッセージ送信成功:", response);
            } else if (response && response.error) {
              console.warn("メッセージ送信エラー:", response.error);
              connectionStatus.textContent = "通信エラー";
              connectionStatus.className = "disconnected";
            }
          }
        );
      } else {
        console.warn("YouTubeページが開かれていません");
        connectionStatus.textContent = "未接続 (YouTubeで開いてください)";
        connectionStatus.className = "disconnected";
      }
    });
  }
});
