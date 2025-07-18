/**
 * YouTube Theater Mode - ポップアップ通信テスト
 * ポップアップとContent Scriptの通信機能をテストする
 */

// テスト用のモック関数
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    lastError: null,
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// グローバルなchromeオブジェクトをモックに置き換え
global.chrome = mockChrome;

// DOMイベントのモック
const mockDOMContentLoaded = () => {
  const event = new Event("DOMContentLoaded");
  document.dispatchEvent(event);
};

// DOM要素のモック
document.getElementById = jest.fn().mockImplementation((id) => {
  const elements = {
    theaterModeToggle: {
      checked: false,
      addEventListener: jest.fn(),
    },
    opacitySlider: {
      value: "0.7",
      addEventListener: jest.fn(),
    },
    opacityValue: {
      textContent: "",
    },
    shortcutKey: {
      value: "t",
      addEventListener: jest.fn(),
    },
    resetOpacityBtn: {
      addEventListener: jest.fn(),
    },
    statusIndicator: {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
    },
    statusText: {
      textContent: "",
    },
    previewOverlay: {
      style: {
        backgroundColor: "",
      },
    },
    shortcutKeyDisplay: {
      textContent: "",
    },
    connectionStatus: {
      textContent: "",
      className: "",
    },
    opacityFeedback: {
      textContent: "",
      style: {
        display: "none",
      },
    },
  };

  return elements[id] || null;
});

describe("ポップアップと Content Script の通信テスト", () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // popup.jsを再読み込み
    jest.isolateModules(() => {
      require("./popup.js");
    });

    // DOMContentLoadedイベントを発火
    mockDOMContentLoaded();
  });

  test("初期化時に設定を読み込む", () => {
    // chrome.runtime.sendMessageが呼ばれたことを確認
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: "getSettings" },
      expect.any(Function)
    );
  });

  test("接続状態を確認する", () => {
    // chrome.tabs.queryが呼ばれたことを確認
    expect(chrome.tabs.query).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
  });

  test("シアターモード切り替え時にメッセージを送信する", () => {
    // theaterModeToggleのchangeイベントハンドラを取得
    const changeHandler =
      document.getElementById("theaterModeToggle").addEventListener.mock
        .calls[0][1];

    // ハンドラを実行
    changeHandler();

    // chrome.runtime.sendMessageが呼ばれたことを確認
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: "toggleTheaterMode" },
      expect.any(Function)
    );

    // コールバック関数を実行（成功ケース）
    const callback = chrome.runtime.sendMessage.mock.calls[1][1];
    callback({ enabled: true });

    // chrome.tabs.queryが呼ばれたことを確認
    expect(chrome.tabs.query).toHaveBeenCalled();
  });

  test("透明度変更時にメッセージを送信する", () => {
    // opacitySliderのinputイベントハンドラを取得
    const inputHandler =
      document.getElementById("opacitySlider").addEventListener.mock
        .calls[0][1];

    // ハンドラを実行
    inputHandler();

    // chrome.runtime.sendMessageが呼ばれたことを確認
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: "saveSettings", settings: { opacity: 0.7 } },
      expect.any(Function)
    );

    // chrome.tabs.queryが呼ばれたことを確認
    expect(chrome.tabs.query).toHaveBeenCalled();
  });

  test("デフォルト透明度リセット時にメッセージを送信する", () => {
    // resetOpacityBtnのclickイベントハンドラを取得
    const clickHandler =
      document.getElementById("resetOpacityBtn").addEventListener.mock
        .calls[0][1];

    // ハンドラを実行
    clickHandler();

    // chrome.runtime.sendMessageが呼ばれたことを確認
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: "saveSettings", settings: { opacity: 0.7 } },
      expect.any(Function)
    );

    // chrome.tabs.queryが呼ばれたことを確認
    expect(chrome.tabs.query).toHaveBeenCalled();
  });

  test("ショートカットキー変更時にメッセージを送信する", () => {
    // shortcutKeyのchangeイベントハンドラを取得
    const changeHandler =
      document.getElementById("shortcutKey").addEventListener.mock.calls[0][1];

    // ハンドラを実行
    changeHandler();

    // chrome.runtime.sendMessageが呼ばれたことを確認
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: "saveSettings", settings: { keyboardShortcut: "t" } },
      expect.any(Function)
    );

    // chrome.tabs.queryが呼ばれたことを確認
    expect(chrome.tabs.query).toHaveBeenCalled();
  });

  test("通信エラー時にエラー表示する", () => {
    // theaterModeToggleのchangeイベントハンドラを取得
    const changeHandler =
      document.getElementById("theaterModeToggle").addEventListener.mock
        .calls[0][1];

    // ハンドラを実行
    changeHandler();

    // コールバック関数を実行（成功ケース）
    const callback = chrome.runtime.sendMessage.mock.calls[1][1];
    callback({ enabled: true });

    // chrome.tabs.queryのコールバックを取得
    const queryCallback = chrome.tabs.query.mock.calls[0][1];

    // YouTubeタブがあると仮定
    queryCallback([{ id: 1, url: "https://www.youtube.com/watch?v=12345" }]);

    // chrome.tabs.sendMessageのコールバックを取得
    const sendMessageCallback = chrome.tabs.sendMessage.mock.calls[0][2];

    // エラーを発生させる
    chrome.runtime.lastError = { message: "テストエラー" };
    sendMessageCallback();

    // エラー表示が更新されたことを確認
    expect(document.getElementById("connectionStatus").textContent).toBe(
      "通信エラー"
    );
    expect(document.getElementById("connectionStatus").className).toBe(
      "disconnected"
    );

    // エラーをリセット
    chrome.runtime.lastError = null;
  });

  test("YouTubeページが開かれていない場合は警告を出す", () => {
    // theaterModeToggleのchangeイベントハンドラを取得
    const changeHandler =
      document.getElementById("theaterModeToggle").addEventListener.mock
        .calls[0][1];

    // ハンドラを実行
    changeHandler();

    // コールバック関数を実行（成功ケース）
    const callback = chrome.runtime.sendMessage.mock.calls[1][1];
    callback({ enabled: true });

    // chrome.tabs.queryのコールバックを取得
    const queryCallback = chrome.tabs.query.mock.calls[0][1];

    // YouTubeタブがないと仮定
    queryCallback([{ id: 1, url: "https://www.google.com" }]);

    // chrome.tabs.sendMessageが呼ばれていないことを確認
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});
