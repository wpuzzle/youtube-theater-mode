/**
 * SettingsManager
 * スキーマベースの設定管理システムを提供
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  StorageAdapter,
  StorageType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
  ({ StorageAdapter, StorageType } = require("./storage-adapter.js"));
}

/**
 * 設定スキーマのデータ型
 * @readonly
 * @enum {string}
 */
const SchemaType = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  OBJECT: "object",
  ARRAY: "array",
  ANY: "any",
};

/**
 * 設定バージョン履歴
 * 設定形式の変更履歴を管理
 * @readonly
 * @type {Array<Object>}
 */
const SETTINGS_VERSIONS = [
  {
    version: "1.0.0",
    description: "初期バージョン",
  },
  {
    version: "1.1.0",
    description: "キーボードショートカットのカスタマイズ機能を追加",
    migrate: (oldSettings) => {
      // 1.0.0 -> 1.1.0 の移行処理
      return {
        ...oldSettings,
        keyboardShortcut: oldSettings.keyboardShortcut || "t",
        version: "1.1.0",
      };
    },
  },
  {
    version: "1.2.0",
    description: "テーマ設定を追加",
    migrate: (oldSettings) => {
      // 1.1.0 -> 1.2.0 の移行処理
      return {
        ...oldSettings,
        theme: oldSettings.theme || "auto",
        version: "1.2.0",
      };
    },
  },
];

/**
 * 現在の最新設定バージョン
 * @type {string}
 */
const CURRENT_SETTINGS_VERSION =
  SETTINGS_VERSIONS[SETTINGS_VERSIONS.length - 1].version;

/**
 * 設定管理クラス
 * スキーマベースのバリデーションと型安全性を提供
 */
class SettingsManager {
  /**
   * SettingsManagerインスタンスを作成
   * @param {Object} options - オプション
   * @param {StorageAdapter} options.storageAdapter - ストレージアダプター
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {Object} [options.schema] - カスタム設定スキーマ
   * @param {Object} [options.initialSettings] - 初期設定値
   * @param {string} [options.storageKey="settings"] - 設定保存用のキー
   */
  constructor(options) {
    if (!options || !options.storageAdapter) {
      throw new Error("StorageAdapter is required");
    }

    this.storageAdapter = options.storageAdapter;
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.storageKey = options.storageKey || "settings";

    // スキーマを設定
    this.schema = options.schema || this.getDefaultSchema();

    // 初期設定
    this.initialSettings = options.initialSettings || this.getDefaultSettings();

    // 設定変更リスナー
    this.changeListeners = new Set();

    // 設定キャッシュ
    this.cachedSettings = null;

    if (this.logger) {
      this.logger.debug("SettingsManager initialized", {
        storageKey: this.storageKey,
        initialSettings: this.initialSettings,
      });
    }
  }

  /**
   * デフォルトの設定スキーマを取得
   * @returns {Object} 設定スキーマ
   */
  getDefaultSchema() {
    return {
      theaterModeEnabled: {
        type: SchemaType.BOOLEAN,
        default: false,
        description: "シアターモードの有効状態",
      },
      opacity: {
        type: SchemaType.NUMBER,
        default: 0.7,
        min: 0,
        max: 0.9,
        description: "オーバーレイの透明度",
      },
      keyboardShortcut: {
        type: SchemaType.STRING,
        default: "t",
        minLength: 1,
        maxLength: 1,
        pattern: /^[a-zA-Z0-9]$/,
        description: "シアターモード切替のキーボードショートカット",
      },
      theme: {
        type: SchemaType.STRING,
        default: "auto",
        enum: ["auto", "light", "dark"],
        description: "テーマ設定",
      },
      autoEnable: {
        type: SchemaType.BOOLEAN,
        default: false,
        description:
          "YouTube動画ページを開いたときに自動的にシアターモードを有効化",
      },
      version: {
        type: SchemaType.STRING,
        default: CURRENT_SETTINGS_VERSION,
        description: "設定バージョン",
      },
    };
  }

  /**
   * デフォルト設定を取得
   * @returns {Object} デフォルト設定
   */
  getDefaultSettings() {
    const defaults = {};

    // スキーマからデフォルト値を抽出
    for (const [key, schema] of Object.entries(this.schema)) {
      defaults[key] = schema.default;
    }

    return defaults;
  }

  /**
   * 設定変更リスナーを登録
   * @param {Function} listener - 設定変更リスナー関数
   * @returns {Function} リスナー削除関数
   */
  onChange(listener) {
    if (typeof listener !== "function") {
      throw new Error("Listener must be a function");
    }

    this.changeListeners.add(listener);

    // リスナー削除関数を返す
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * 設定変更をリスナーに通知
   * @param {Object} settings - 新しい設定
   * @param {Object} previousSettings - 以前の設定
   * @private
   */
  _notifyChangeListeners(settings, previousSettings) {
    for (const listener of this.changeListeners) {
      try {
        listener(settings, previousSettings);
      } catch (error) {
        if (this.logger) {
          this.logger.warn("Error in settings change listener", error);
        }
      }
    }
  }

  /**
   * 設定を読み込み
   * @returns {Promise<Result<Object>>} 設定オブジェクト
   */
  async loadSettings() {
    try {
      // キャッシュがある場合はそれを返す
      if (this.cachedSettings) {
        return Result.success(this.cachedSettings);
      }

      if (this.logger) {
        this.logger.debug("Loading settings from storage");
      }

      // ストレージから設定を読み込み
      const result = await this.storageAdapter.get(this.storageKey, {
        defaultValue: this.initialSettings,
      });

      if (result.isFailure()) {
        if (this.logger) {
          this.logger.warn("Failed to load settings, using defaults", {
            error: result.error,
          });
        }

        // デフォルト設定を使用
        this.cachedSettings = this.initialSettings;
        return Result.success(this.cachedSettings);
      }

      let settings = result.data;

      // 設定バージョンをチェックして必要に応じて移行
      settings = await this._migrateSettingsIfNeeded(settings);

      // 設定を検証
      const validationResult = this.validateSettings(settings);
      if (validationResult.isFailure()) {
        if (this.logger) {
          this.logger.warn(
            "Invalid settings, using defaults with valid values",
            {
              error: validationResult.error,
            }
          );
        }

        // 無効な設定を修正
        settings = this._sanitizeSettings(settings);
      }

      // キャッシュに保存
      this.cachedSettings = settings;

      return Result.success(settings);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error loading settings", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "loadSettings" },
          type: ErrorType.STORAGE_ERROR,
        });
      }

      // エラー時はデフォルト設定を返す
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { defaultsUsed: true },
      });
    }
  }

  /**
   * 設定を保存
   * @param {Object} settings - 保存する設定
   * @returns {Promise<Result<void>>} 保存結果
   */
  async saveSettings(settings) {
    try {
      if (this.logger) {
        this.logger.debug("Saving settings", { settings });
      }

      // 現在の設定を読み込み
      const currentResult = await this.loadSettings();
      const currentSettings = currentResult.isSuccess()
        ? currentResult.data
        : this.initialSettings;

      // 新しい設定をマージ
      const newSettings = {
        ...currentSettings,
        ...settings,
        // バージョンは常に最新に
        version: CURRENT_SETTINGS_VERSION,
      };

      // 設定を検証
      const validationResult = this.validateSettings(newSettings);
      if (validationResult.isFailure()) {
        return validationResult;
      }

      // ストレージに保存
      const saveResult = await this.storageAdapter.set(
        this.storageKey,
        newSettings
      );
      if (saveResult.isFailure()) {
        return saveResult;
      }

      // キャッシュを更新
      const previousSettings = this.cachedSettings;
      this.cachedSettings = newSettings;

      // 変更をリスナーに通知
      this._notifyChangeListeners(newSettings, previousSettings);

      return Result.success();
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error saving settings", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "saveSettings", settings },
          type: ErrorType.STORAGE_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
      });
    }
  }

  /**
   * 設定をリセット
   * @returns {Promise<Result<void>>} リセット結果
   */
  async resetSettings() {
    try {
      if (this.logger) {
        this.logger.debug("Resetting settings to defaults");
      }

      const defaultSettings = this.getDefaultSettings();

      // ストレージに保存
      const saveResult = await this.storageAdapter.set(
        this.storageKey,
        defaultSettings
      );
      if (saveResult.isFailure()) {
        return saveResult;
      }

      // キャッシュを更新
      const previousSettings = this.cachedSettings;
      this.cachedSettings = defaultSettings;

      // 変更をリスナーに通知
      this._notifyChangeListeners(defaultSettings, previousSettings);

      return Result.success();
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error resetting settings", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "resetSettings" },
          type: ErrorType.STORAGE_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
      });
    }
  }

  /**
   * 設定値を取得
   * @param {string} key - 設定キー
   * @returns {Promise<Result<any>>} 設定値
   */
  async getSetting(key) {
    try {
      // 設定を読み込み
      const result = await this.loadSettings();
      if (result.isFailure()) {
        return result;
      }

      const settings = result.data;

      // キーが存在するか確認
      if (!this.schema.hasOwnProperty(key)) {
        return Result.failure(`Unknown setting key: ${key}`, {
          type: ErrorType.VALIDATION_ERROR,
        });
      }

      return Result.success(settings[key]);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error getting setting: ${key}`, error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { key },
      });
    }
  }

  /**
   * 設定値を更新
   * @param {string} key - 設定キー
   * @param {any} value - 設定値
   * @returns {Promise<Result<void>>} 更新結果
   */
  async updateSetting(key, value) {
    try {
      // キーが存在するか確認
      if (!this.schema.hasOwnProperty(key)) {
        return Result.failure(`Unknown setting key: ${key}`, {
          type: ErrorType.VALIDATION_ERROR,
        });
      }

      // 値を検証
      const validationResult = this._validateValue(key, value);
      if (validationResult.isFailure()) {
        return validationResult;
      }

      // 設定を保存
      return await this.saveSettings({ [key]: value });
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error updating setting: ${key}`, error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { key, value },
      });
    }
  }

  /**
   * 設定をバリデート
   * @param {Object} settings - バリデーション対象
   * @returns {Result<boolean>} バリデーション結果
   */
  validateSettings(settings) {
    try {
      const errors = [];

      // 各設定項目を検証
      for (const [key, schema] of Object.entries(this.schema)) {
        // 必須項目のチェック
        if (
          schema.required &&
          (settings[key] === undefined || settings[key] === null)
        ) {
          errors.push({
            key,
            message: `Required setting '${key}' is missing`,
          });
          continue;
        }

        // 値が存在する場合は検証
        if (settings[key] !== undefined && settings[key] !== null) {
          const validationResult = this._validateValue(key, settings[key]);
          if (validationResult.isFailure()) {
            errors.push({
              key,
              message: validationResult.error.message,
            });
          }
        }
      }

      // エラーがある場合
      if (errors.length > 0) {
        return Result.failure("Settings validation failed", {
          type: ErrorType.VALIDATION_ERROR,
          context: { errors },
        });
      }

      return Result.success(true);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error validating settings", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 単一の設定値を検証
   * @param {string} key - 設定キー
   * @param {any} value - 検証する値
   * @returns {Result<boolean>} 検証結果
   * @private
   */
  _validateValue(key, value) {
    const schema = this.schema[key];
    if (!schema) {
      return Result.failure(`Unknown setting key: ${key}`, {
        type: ErrorType.VALIDATION_ERROR,
      });
    }

    // 型チェック
    if (schema.type !== SchemaType.ANY) {
      let typeValid = false;

      switch (schema.type) {
        case SchemaType.STRING:
          typeValid = typeof value === "string";
          break;
        case SchemaType.NUMBER:
          typeValid = typeof value === "number" && !isNaN(value);
          break;
        case SchemaType.BOOLEAN:
          typeValid = typeof value === "boolean";
          break;
        case SchemaType.OBJECT:
          typeValid =
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value);
          break;
        case SchemaType.ARRAY:
          typeValid = Array.isArray(value);
          break;
      }

      if (!typeValid) {
        return Result.failure(
          `Invalid type for '${key}': expected ${schema.type}`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
    }

    // 数値の範囲チェック
    if (schema.type === SchemaType.NUMBER) {
      if (schema.min !== undefined && value < schema.min) {
        return Result.failure(
          `Value for '${key}' is below minimum: ${schema.min}`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
      if (schema.max !== undefined && value > schema.max) {
        return Result.failure(
          `Value for '${key}' exceeds maximum: ${schema.max}`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
    }

    // 文字列の長さチェック
    if (schema.type === SchemaType.STRING) {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return Result.failure(
          `String '${key}' is too short (min: ${schema.minLength})`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        return Result.failure(
          `String '${key}' is too long (max: ${schema.maxLength})`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        return Result.failure(
          `String '${key}' does not match required pattern`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
    }

    // 配列の長さチェック
    if (schema.type === SchemaType.ARRAY) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        return Result.failure(
          `Array '${key}' has too few items (min: ${schema.minItems})`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        return Result.failure(
          `Array '${key}' has too many items (max: ${schema.maxItems})`,
          {
            type: ErrorType.VALIDATION_ERROR,
          }
        );
      }
    }

    // 列挙型チェック
    if (schema.enum !== undefined && !schema.enum.includes(value)) {
      return Result.failure(
        `Value for '${key}' must be one of: ${schema.enum.join(", ")}`,
        {
          type: ErrorType.VALIDATION_ERROR,
        }
      );
    }

    return Result.success(true);
  }

  /**
   * 無効な設定を修正
   * @param {Object} settings - 修正対象の設定
   * @returns {Object} 修正された設定
   * @private
   */
  _sanitizeSettings(settings) {
    const sanitized = { ...settings };

    // 各設定項目を検証して修正
    for (const [key, schema] of Object.entries(this.schema)) {
      // 値が存在しない場合はデフォルト値を使用
      if (sanitized[key] === undefined || sanitized[key] === null) {
        sanitized[key] = schema.default;
        continue;
      }

      // 型チェックと修正
      switch (schema.type) {
        case SchemaType.STRING:
          if (typeof sanitized[key] !== "string") {
            sanitized[key] = String(sanitized[key]);
          }
          // 長さ制限
          if (
            schema.maxLength !== undefined &&
            sanitized[key].length > schema.maxLength
          ) {
            sanitized[key] = sanitized[key].substring(0, schema.maxLength);
          }
          // パターンチェック
          if (schema.pattern && !schema.pattern.test(sanitized[key])) {
            sanitized[key] = schema.default;
          }
          break;

        case SchemaType.NUMBER:
          if (typeof sanitized[key] !== "number" || isNaN(sanitized[key])) {
            sanitized[key] = schema.default;
          } else {
            // 範囲制限
            if (schema.min !== undefined) {
              sanitized[key] = Math.max(schema.min, sanitized[key]);
            }
            if (schema.max !== undefined) {
              sanitized[key] = Math.min(schema.max, sanitized[key]);
            }
          }
          break;

        case SchemaType.BOOLEAN:
          if (typeof sanitized[key] !== "boolean") {
            sanitized[key] = Boolean(sanitized[key]);
          }
          break;

        case SchemaType.ARRAY:
          if (!Array.isArray(sanitized[key])) {
            sanitized[key] = schema.default;
          } else {
            // 長さ制限
            if (
              schema.maxItems !== undefined &&
              sanitized[key].length > schema.maxItems
            ) {
              sanitized[key] = sanitized[key].slice(0, schema.maxItems);
            }
          }
          break;

        case SchemaType.OBJECT:
          if (
            typeof sanitized[key] !== "object" ||
            sanitized[key] === null ||
            Array.isArray(sanitized[key])
          ) {
            sanitized[key] = schema.default;
          }
          break;

        default:
          // ANY型は変更なし
          break;
      }

      // 列挙型チェック
      if (schema.enum !== undefined && !schema.enum.includes(sanitized[key])) {
        sanitized[key] = schema.default;
      }
    }

    // バージョンを最新に
    sanitized.version = CURRENT_SETTINGS_VERSION;

    return sanitized;
  }

  /**
   * 必要に応じて設定を移行
   * @param {Object} settings - 移行対象の設定
   * @returns {Object} 移行後の設定
   * @private
   */
  async _migrateSettingsIfNeeded(settings) {
    // バージョンが未設定の場合は最初のバージョンとみなす
    const currentVersion = settings.version || SETTINGS_VERSIONS[0].version;

    // 最新バージョンの場合は移行不要
    if (currentVersion === CURRENT_SETTINGS_VERSION) {
      return settings;
    }

    if (this.logger) {
      this.logger.info(
        `Migrating settings from ${currentVersion} to ${CURRENT_SETTINGS_VERSION}`
      );
    }

    // 現在のバージョンのインデックスを取得
    const currentVersionIndex = SETTINGS_VERSIONS.findIndex(
      (v) => v.version === currentVersion
    );

    // 不明なバージョンの場合は最初のバージョンとみなす
    const startIndex = currentVersionIndex === -1 ? 0 : currentVersionIndex;

    // 順番に移行処理を適用
    let migratedSettings = { ...settings };

    for (let i = startIndex + 1; i < SETTINGS_VERSIONS.length; i++) {
      const versionInfo = SETTINGS_VERSIONS[i];

      if (typeof versionInfo.migrate === "function") {
        try {
          migratedSettings = versionInfo.migrate(migratedSettings);

          if (this.logger) {
            this.logger.debug(`Migrated to ${versionInfo.version}`, {
              description: versionInfo.description,
            });
          }
        } catch (error) {
          if (this.logger) {
            this.logger.error(
              `Error migrating to ${versionInfo.version}`,
              error
            );
          }

          // エラー時は移行を中断
          break;
        }
      }
    }

    // バージョンを最新に更新
    migratedSettings.version = CURRENT_SETTINGS_VERSION;

    // 移行した設定を保存
    await this.storageAdapter.set(this.storageKey, migratedSettings);

    return migratedSettings;
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cachedSettings = null;
  }

  /**
   * 設定スキーマを取得
   * @returns {Object} 設定スキーマ
   */
  getSchema() {
    return { ...this.schema };
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SchemaType,
    SETTINGS_VERSIONS,
    CURRENT_SETTINGS_VERSION,
    SettingsManager,
  };
} else if (typeof window !== "undefined") {
  window.SchemaType = SchemaType;
  window.SETTINGS_VERSIONS = SETTINGS_VERSIONS;
  window.CURRENT_SETTINGS_VERSION = CURRENT_SETTINGS_VERSION;
  window.SettingsManager = SettingsManager;
}
