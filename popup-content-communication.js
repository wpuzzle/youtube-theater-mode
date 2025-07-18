/**
 * YouTube Theater Mode - ポップアップとContent Scriptの通信機能
 * content.jsに統合するためのコード
 */

/**
 * ポップアップからのメッセージを処理するハンドラー
 * @param {Object} theaterModeController - シアターモードコントローラーのインスタンス
 * @returns {Function} メッセージハンドラー関数
 */
function createPopupMessageHandler(theaterModeController) {
  return async function handlePopupMessage(message, sender, sendResponse) {
    console.log("YouTube Theater Mode: メッセージを受信しました", message);

    try {
      // 即座に応答を返す（非同期処理のため）
      sendResponse({ received: true });

      // メッセージのアクションに基づいて処理
      switch (message.action) {
        case "toggleTheaterMode":
          // シアターモードの切り替え
          if (message.enabled !== undefined) {
            if (message.enabled) {
              await theaterModeController.enableTheaterMode();
            } else {
              await theaterModeController.disableTheaterMode();
            }
          } else {
            await theaterModeController.toggleTheaterMode();
          }

          // 状態を返す
          return {
            success: true,
            isActive: theaterModeController.isTheaterModeActive,
          };

        case "updateOpacity":
          // 透明度の更新
          if (message.opacity !== undefined) {
            await theaterModeController.updateOpacity(message.opacity);
            return {
              success: true,
              opacity: theaterModeController.currentOpacity,
            };
          }
          return {
            success: false,
            error: "透明度が指定されていません",
          };

        case "setDefaultOpacity":
          // デフォルト透明度の設定
          await theaterModeController.setDefaultOpacity();
          return {
            success: true,
            opacity: theaterModeController.currentOpacity,
          };

        case "updateShortcut":
          // ショートカットキーの更新
          if (message.shortcut) {
            // ショートカットキーの更新処理（実装は省略）
            return {
              success: true,
              shortcut: message.shortcut,
            };
          }
          return {
            success: false,
            error: "ショートカットキーが指定されていません",
          };

        case "getState":
          // 現在の状態を取得
          return {
            success: true,
            state: theaterModeController.getState(),
          };

        default:
          console.warn(
            `YouTube Theater Mode: 未知のアクション: ${message.action}`
          );
          return {
            success: false,
            error: `未知のアクション: ${message.action}`,
          };
      }
    } catch (error) {
      console.error("YouTube Theater Mode: メッセージ処理エラー", error);
      return {
        success: false,
        error: error.message || "不明なエラー",
      };
    }
  };
}

/**
 * ポップアップとの通信を設定
 * @param {Object} theaterModeController - シアターモードコントローラーのインスタンス
 */
function setupPopupCommunication(theaterModeController) {
  // メッセージハンドラーを作成
  const messageHandler = createPopupMessageHandler(theaterModeController);

  // メッセージリスナーを設定
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 非同期処理のためにtrueを返す
    const result = messageHandler(message, sender, sendResponse);

    // 結果がPromiseの場合は処理
    if (result instanceof Promise) {
      result
        .then((response) => {
          try {
            sendResponse(response);
          } catch (error) {
            console.warn("YouTube Theater Mode: 応答送信エラー", error);
          }
        })
        .catch((error) => {
          console.error("YouTube Theater Mode: メッセージ処理エラー", error);
          try {
            sendResponse({
              success: false,
              error: error.message || "不明なエラー",
            });
          } catch (sendError) {
            console.warn(
              "YouTube Theater Mode: エラー応答送信エラー",
              sendError
            );
          }
        });
    }

    return true; // 非同期応答を示す
  });

  console.log("YouTube Theater Mode: ポップアップ通信を設定しました");
}

// content.jsに統合するためのエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createPopupMessageHandler,
    setupPopupCommunication,
  };
}
