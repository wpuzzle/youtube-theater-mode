/**
 * LegacyAdapter テストスイート
 * 既存APIと新実装の橋渡し機能をテスト
 */

// テストフレームワークの読み込み
if (typeof require !== "undefined") {
  // Node.js環境
  const { TestFramework } = require("../infrastructure/test-framework.js");
  const { MockFactory } = require("../infrastructure/mock-factory.js");
  const { LegacyAdapter } = require("../infrastructure/legacy-adapter.js");
} else {
  // ブラウザ環境では、これらは既にグローバルに読み込まれている前提
}

/**
 * LegacyAdapterテストクラス
 */
class LegacyAdapterTest {
  constructor() {
    this.testFramework = new TestFramework("LegacyAdapter");
    this.mockFactory = new MockFactory();
    this.adapter = null;
    this.mockDependencies = null;
  }

  /**
   * テストセットアップ
   */
  async setup() {
    // モック依存関係を作成
    this.mockDependencies = {
      logger: this.mockFactory.createMockLogger(),
      errorHandler: this.mockFactory.createMockErrorHandler(),
      stateStore: this.mockFactory.createMockStateStore(),
      settingsManager: this.mockFactory.createMockSettingsManager(),
      elementManager: this.mockFactory.createMockElementManager(),
      messageBus: this.mockFactory.createMockMessageBus(),
    };

    // LegacyAdapterインスタンスを作成
    this.adapter = new LegacyAdapter(this.mockDependencies);
  }

  /**
   * テストクリーンアップ
   */
  async teardown() {
    if (this.adapter) {
      this.adapter.cleanup();
      this.adapter = null;
    }
    this.mockDependencies = null;
  }

  /**
   * 基本的な初期化テスト
   */
  async testBasicInitialization() {
    this.testFramework.describe("Basic Initialization", () => {
      this.testFramework.it(
        "should initialize with required dependencies",
        () => {
          this.testFramework.assert(
            this.adapter !== null,
            "LegacyAdapter should be created"
          );

          this.testFramework.assert(
            this.adapter.isLegacyModeEnabled(),
            "Legacy mode should be enabled by default"
          );
        }
      );

      this.testFramework.it(
        "should throw error without required dependencies",
        () => {
          let errorThrown = false;
          try {
            new LegacyAdapter();
          } catch (error) {
            errorThrown = true;
          }

          this.testFramework.assert(
            errorThrown,
            "Should throw error when options are not provided"
          );
        }
      );
    });
  }

  /**
   * レガシーTheaterModeControllerテスト
   */
  async testLegacyTheaterModeController() {
    this.testFramework.describe("Legacy TheaterModeController", () => {
      let legacyController;

      this.testFramework.beforeEach(() => {
        legacyController = this.adapter.createLegacyTheaterModeController();
      });

      this.testFramework.it(
        "should create legacy controller with expected properties",
        () => {
          this.testFramework.assert(
            typeof legacyController === "object",
            "Should return an object"
          );

          this.testFramework.assert(
            typeof legacyController.initialize === "function",
            "Should have initialize method"
          );

          this.testFramework.assert(
            typeof legacyController.toggleTheaterMode === "function",
            "Should have toggleTheaterMode method"
          );

          this.testFramework.assert(
            typeof legacyController.updateOpacity === "function",
            "Should have updateOpacity method"
          );

          this.testFramework.assert(
            legacyController.hasOwnProperty("isTheaterModeActive"),
            "Should have isTheaterModeActive property"
          );

          this.testFramework.assert(
            legacyController.hasOwnProperty("currentOpacity"),
            "Should have currentOpacity property"
          );
        }
      );

      this.testFramework.it("should initialize successfully", async () => {
        // モックの設定を準備
        this.mockDependencies.settingsManager.loadSettings.mockResolvedValue({
          isSuccess: () => true,
          data: {
            opacity: 0.8,
            theaterModeEnabled: true,
          },
        });

        this.mockDependencies.stateStore.dispatch.mockResolvedValue({
          isFailure: () => false,
          isSuccess: () => true,
        });

        this.mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue(
          {
            isFailure: () => false,
            isSuccess: () => true,
            data: document.createElement("div"),
          }
        );

        const result = await legacyController.initialize();

        this.testFramework.assert(
          result === true,
          "Initialize should return true on success"
        );

        this.testFramework.assert(
          legacyController.initialized === true,
          "initialized flag should be set to true"
        );

        this.testFramework.assert(
          legacyController.currentOpacity === 0.8,
          "currentOpacity should be set from settings"
        );

        this.testFramework.assert(
          legacyController.isTheaterModeActive === true,
          "isTheaterModeActive should be set from settings"
        );
      });

      this.testFramework.it(
        "should handle initialization failure gracefully",
        async () => {
          // モックを失敗するように設定
          this.mockDependencies.settingsManager.loadSettings.mockResolvedValue({
            isSuccess: () => false,
            isFailure: () => true,
            error: new Error("Settings load failed"),
          });

          const result = await legacyController.initialize();

          this.testFramework.assert(
            result === false,
            "Initialize should return false on failure"
          );
        }
      );

      this.testFramework.it("should toggle theater mode", async () => {
        // 初期化
        await this.setupSuccessfulInitialization(legacyController);

        // モックの設定
        this.mockDependencies.stateStore.dispatch.mockResolvedValue({
          isFailure: () => false,
          isSuccess: () => true,
        });

        this.mockDependencies.stateStore.getStateValue.mockReturnValue(true);

        const result = await legacyController.toggleTheaterMode();

        this.testFramework.assert(
          result === true,
          "toggleTheaterMode should return new state"
        );

        this.testFramework.assert(
          legacyController.isTheaterModeActive === true,
          "isTheaterModeActive should be updated"
        );
      });

      this.testFramework.it("should update opacity", async () => {
        // 初期化
        await this.setupSuccessfulInitialization(legacyController);

        // モックの設定
        this.mockDependencies.stateStore.dispatch.mockResolvedValue({
          isFailure: () => false,
          isSuccess: () => true,
        });

        await legacyController.updateOpacity(0.5);

        this.testFramework.assert(
          legacyController.currentOpacity === 0.5,
          "currentOpacity should be updated"
        );
      });

      this.testFramework.it("should get current state", async () => {
        await this.setupSuccessfulInitialization(legacyController);

        const state = legacyController.getState();

        this.testFramework.assert(
          typeof state === "object",
          "getState should return an object"
        );

        this.testFramework.assert(
          state.hasOwnProperty("isActive"),
          "State should have isActive property"
        );

        this.testFramework.assert(
          state.hasOwnProperty("opacity"),
          "State should have opacity property"
        );

        this.testFramework.assert(
          state.hasOwnProperty("initialized"),
          "State should have initialized property"
        );
      });
    });
  }

  /**
   * レガシーElementDetectorテスト
   */
  async testLegacyElementDetector() {
    this.testFramework.describe("Legacy ElementDetector", () => {
      let legacyDetector;

      this.testFramework.beforeEach(() => {
        legacyDetector = this.adapter.createLegacyElementDetector();
      });

      this.testFramework.it(
        "should create legacy detector with expected methods",
        () => {
          this.testFramework.assert(
            typeof legacyDetector === "object",
            "Should return an object"
          );

          this.testFramework.assert(
            typeof legacyDetector.findElementWithFallback === "function",
            "Should have findElementWithFallback method"
          );

          this.testFramework.assert(
            typeof legacyDetector.waitForElement === "function",
            "Should have waitForElement method"
          );

          this.testFramework.assert(
            typeof legacyDetector.detectVideoPlayerAsync === "function",
            "Should have detectVideoPlayerAsync method"
          );

          this.testFramework.assert(
            typeof legacyDetector.findOverlayTargets === "function",
            "Should have findOverlayTargets method"
          );
        }
      );

      this.testFramework.it("should find element with fallback", () => {
        const mockElement = document.createElement("div");

        this.mockDependencies.elementManager.findElementWithFallback.mockReturnValue(
          {
            isSuccess: () => true,
            data: mockElement,
          }
        );

        const result = legacyDetector.findElementWithFallback("#test");

        this.testFramework.assert(
          result === mockElement,
          "Should return the found element"
        );
      });

      this.testFramework.it("should return null when element not found", () => {
        this.mockDependencies.elementManager.findElementWithFallback.mockReturnValue(
          {
            isSuccess: () => false,
            data: null,
          }
        );

        const result = legacyDetector.findElementWithFallback("#nonexistent");

        this.testFramework.assert(
          result === null,
          "Should return null when element not found"
        );
      });

      this.testFramework.it("should wait for element", async () => {
        const mockElement = document.createElement("div");

        this.mockDependencies.elementManager.waitForElement.mockResolvedValue({
          isSuccess: () => true,
          data: mockElement,
        });

        const result = await legacyDetector.waitForElement("#test", 5000);

        this.testFramework.assert(
          result === mockElement,
          "Should return the found element"
        );
      });

      this.testFramework.it("should detect video player", async () => {
        const mockPlayer = document.createElement("div");

        this.mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue(
          {
            isSuccess: () => true,
            data: mockPlayer,
          }
        );

        const result = await legacyDetector.detectVideoPlayerAsync(10000);

        this.testFramework.assert(
          result === mockPlayer,
          "Should return the video player element"
        );
      });

      this.testFramework.it("should find overlay targets", () => {
        const mockTargets = [
          document.createElement("div"),
          document.createElement("div"),
        ];

        this.mockDependencies.elementManager.findOverlayTargets.mockReturnValue(
          {
            isSuccess: () => true,
            data: mockTargets,
          }
        );

        const result = legacyDetector.findOverlayTargets();

        this.testFramework.assert(
          Array.isArray(result),
          "Should return an array"
        );

        this.testFramework.assert(
          result.length === 2,
          "Should return correct number of elements"
        );
      });
    });
  }

  /**
   * レガシーSettingsManagerテスト
   */
  async testLegacySettingsManager() {
    this.testFramework.describe("Legacy SettingsManager", () => {
      let legacySettings;

      this.testFramework.beforeEach(() => {
        legacySettings = this.adapter.createLegacySettingsManager();
      });

      this.testFramework.it(
        "should create legacy settings manager with expected properties",
        () => {
          this.testFramework.assert(
            typeof legacySettings === "object",
            "Should return an object"
          );

          this.testFramework.assert(
            typeof legacySettings.loadSettings === "function",
            "Should have loadSettings method"
          );

          this.testFramework.assert(
            typeof legacySettings.saveSettings === "function",
            "Should have saveSettings method"
          );

          this.testFramework.assert(
            legacySettings.hasOwnProperty("defaultSettings"),
            "Should have defaultSettings property"
          );
        }
      );

      this.testFramework.it(
        "should load settings in legacy format",
        async () => {
          const newFormatSettings = {
            opacity: 0.6,
            theaterModeEnabled: true,
            keyboardShortcut: "t",
            version: "1.2.0",
          };

          this.mockDependencies.settingsManager.loadSettings.mockResolvedValue({
            isSuccess: () => true,
            data: newFormatSettings,
          });

          const result = await legacySettings.loadSettings();

          this.testFramework.assert(
            typeof result === "object",
            "Should return an object"
          );

          this.testFramework.assert(
            result.opacity === 0.6,
            "Should preserve opacity value"
          );

          this.testFramework.assert(
            result.isEnabled === true,
            "Should convert theaterModeEnabled to isEnabled"
          );

          this.testFramework.assert(
            result.shortcutKey === "Ctrl+Shift+T",
            "Should convert keyboardShortcut to legacy format"
          );
        }
      );

      this.testFramework.it("should save settings in new format", async () => {
        const legacyFormatSettings = {
          opacity: 0.8,
          isEnabled: false,
          shortcutKey: "Ctrl+Shift+T",
        };

        this.mockDependencies.settingsManager.saveSettings.mockResolvedValue({
          isSuccess: () => true,
        });

        const result = await legacySettings.saveSettings(legacyFormatSettings);

        this.testFramework.assert(
          result === true,
          "Should return true on successful save"
        );

        // 新形式での保存が呼ばれたことを確認
        this.testFramework.assert(
          this.mockDependencies.settingsManager.saveSettings.mock.calls
            .length === 1,
          "Should call new settings manager save method"
        );

        const savedSettings =
          this.mockDependencies.settingsManager.saveSettings.mock.calls[0][0];

        this.testFramework.assert(
          savedSettings.opacity === 0.8,
          "Should preserve opacity value"
        );

        this.testFramework.assert(
          savedSettings.theaterModeEnabled === false,
          "Should convert isEnabled to theaterModeEnabled"
        );

        this.testFramework.assert(
          savedSettings.keyboardShortcut === "t",
          "Should convert shortcutKey to new format"
        );
      });

      this.testFramework.it("should handle save failure", async () => {
        this.mockDependencies.settingsManager.saveSettings.mockResolvedValue({
          isSuccess: () => false,
          isFailure: () => true,
        });

        const result = await legacySettings.saveSettings({ opacity: 0.5 });

        this.testFramework.assert(
          result === false,
          "Should return false on save failure"
        );
      });
    });
  }

  /**
   * コンポーネント登録テスト
   */
  async testComponentRegistration() {
    this.testFramework.describe("Component Registration", () => {
      this.testFramework.it(
        "should register and retrieve legacy components",
        () => {
          const mockComponent = { name: "test", version: "1.0" };

          this.adapter.registerLegacyComponent("testComponent", mockComponent);

          const retrieved = this.adapter.getLegacyComponent("testComponent");

          this.testFramework.assert(
            retrieved === mockComponent,
            "Should retrieve the registered component"
          );
        }
      );

      this.testFramework.it(
        "should return null for unregistered components",
        () => {
          const retrieved = this.adapter.getLegacyComponent("nonexistent");

          this.testFramework.assert(
            retrieved === null,
            "Should return null for unregistered components"
          );
        }
      );
    });
  }

  /**
   * 移行状況テスト
   */
  async testMigrationStatus() {
    this.testFramework.describe("Migration Status", () => {
      this.testFramework.it("should provide migration status", () => {
        this.adapter.registerLegacyComponent("comp1", {});
        this.adapter.registerLegacyComponent("comp2", {});

        const status = this.adapter.getMigrationStatus();

        this.testFramework.assert(
          typeof status === "object",
          "Should return an object"
        );

        this.testFramework.assert(
          status.legacyModeEnabled === true,
          "Should show legacy mode as enabled"
        );

        this.testFramework.assert(
          Array.isArray(status.registeredComponents),
          "Should include registered components array"
        );

        this.testFramework.assert(
          status.registeredComponents.length === 2,
          "Should show correct number of registered components"
        );
      });

      this.testFramework.it("should disable legacy mode", () => {
        this.testFramework.assert(
          this.adapter.isLegacyModeEnabled() === true,
          "Legacy mode should be enabled initially"
        );

        this.adapter.disableLegacyMode();

        this.testFramework.assert(
          this.adapter.isLegacyModeEnabled() === false,
          "Legacy mode should be disabled after calling disableLegacyMode"
        );
      });
    });
  }

  /**
   * 成功する初期化のセットアップヘルパー
   * @param {Object} legacyController - レガシーコントローラー
   */
  async setupSuccessfulInitialization(legacyController) {
    this.mockDependencies.settingsManager.loadSettings.mockResolvedValue({
      isSuccess: () => true,
      data: {
        opacity: 0.7,
        theaterModeEnabled: false,
      },
    });

    this.mockDependencies.stateStore.dispatch.mockResolvedValue({
      isFailure: () => false,
      isSuccess: () => true,
    });

    this.mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue({
      isFailure: () => false,
      isSuccess: () => true,
      data: document.createElement("div"),
    });

    await legacyController.initialize();
  }

  /**
   * 全テストを実行
   */
  async runAllTests() {
    console.log("Starting LegacyAdapter tests...");

    try {
      await this.setup();

      await this.testBasicInitialization();
      await this.testLegacyTheaterModeController();
      await this.testLegacyElementDetector();
      await this.testLegacySettingsManager();
      await this.testComponentRegistration();
      await this.testMigrationStatus();

      await this.teardown();

      this.testFramework.printResults();
      return this.testFramework.getResults();
    } catch (error) {
      console.error("Test execution failed:", error);
      throw error;
    }
  }
}

// テスト実行
if (typeof window !== "undefined") {
  // ブラウザ環境
  window.LegacyAdapterTest = LegacyAdapterTest;
} else if (typeof module !== "undefined") {
  // Node.js環境
  module.exports = { LegacyAdapterTest };
}
