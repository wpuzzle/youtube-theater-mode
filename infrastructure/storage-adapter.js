/**
 * StorageAdapter
 * Chrome Storage API の抽象化レイヤーを提供
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
}

/**
 * ストレージタイプの定義
 * @readonly
 * @enum {string}
 */
const StorageType = {
  SYNC: "sync",
  LOCAL: "local",
  SESSION: "session",
  MEMORY: "memory",
};

/**
 * ストレージアダプター
 * Chrome Storage API の抽象化レイヤーを提供
 */
class StorageAdapter {
  /**
   * StorageAdapterインスタンスを作成
   * @param {Object} options - オプション
   * @param {string} [options.namespace="app"] - ストレージ名前空間
   * @param {StorageType} [options.preferredType=StorageType.SYNC] - 優先ストレージタイプ
   * @param {Array<StorageType>} [options.fallbackTypes=[StorageType.LOCAL, StorageType.MEMORY]] - フォールバックストレージタイプ
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   */
  constructor(options = {}) {
    this.namespace = options.namespace || "app";
    this.preferredType = options.preferredType || StorageType.SYNC;
    this.fallbackTypes = options.fallbackTypes || [
      StorageType.LOCAL,
      StorageType.MEMORY,
    ];
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;

    // メモリストレージ
    this.memoryStorage = new Map();

    // 利用可能なストレージタイプ
    this.availableTypes = this._detectAvailableStorageTypes();

    // 変更リスナー
    this.changeListeners = new Map();

    // Chrome Storage APIのリスナーを設定
    this._setupChromeListeners();
  }

  /**
   * 利用可能なストレージタイプを検出
   * @returns {Array<StorageType>} 利用可能なストレージタイプ
   * @private
   */
  _detectAvailableStorageTypes() {
    const available = [StorageType.MEMORY]; // メモリストレージは常に利用可能

    // Chrome Storage APIの利用可能性をチェック
    if (typeof chrome !== "undefined" && chrome.storage) {
      if (chrome.storage.sync) {
        available.push(StorageType.SYNC);
      }
      if (chrome.storage.local) {
        available.push(StorageType.LOCAL);
      }
      if (chrome.storage.session) {
        available.push(StorageType.SESSION);
      }
    }

    // localStorage/sessionStorageの利用可能性をチェック
    if (typeof localStorage !== "undefined") {
      if (!available.includes(StorageType.LOCAL)) {
        available.push(StorageType.LOCAL);
      }
    }
    if (typeof sessionStorage !== "undefined") {
      if (!available.includes(StorageType.SESSION)) {
        available.push(StorageType.SESSION);
      }
    }

    if (this.logger) {
      this.logger.debug("Detected available storage types", { available });
    }

    return available;
  }

  /**
   * Chrome Storage APIのリスナーを設定
   * @private
   */
  _setupChromeListeners() {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.onChanged
    ) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        // 名前空間に関連する変更のみを処理
        for (const [key, change] of Object.entries(changes)) {
          if (key.startsWith(`${this.namespace}.`)) {
            const actualKey = key.substring(this.namespace.length + 1);
            const storageType = this._chromeAreaToStorageType(areaName);

            // リスナーに通知
            this._notifyChangeListeners(
              actualKey,
              change.newValue,
              change.oldValue,
              storageType
            );
          }
        }
      });
    }
  }

  /**
   * Chrome Storage APIのエリア名をStorageTypeに変換
   * @param {string} areaName - Chrome Storage APIのエリア名
   * @returns {StorageType} StorageType
   * @private
   */
  _chromeAreaToStorageType(areaName) {
    switch (areaName) {
      case "sync":
        return StorageType.SYNC;
      case "local":
        return StorageType.LOCAL;
      case "session":
        return StorageType.SESSION;
      default:
        return StorageType.MEMORY;
    }
  }

  /**
   * 変更リスナーに通知
   * @param {string} key - 変更されたキー
   * @param {any} newValue - 新しい値
   * @param {any} oldValue - 古い値
   * @param {StorageType} storageType - ストレージタイプ
   * @private
   */
  _notifyChangeListeners(key, newValue, oldValue, storageType) {
    // 特定のキーのリスナー
    const keyListeners = this.changeListeners.get(key);
    if (keyListeners) {
      for (const listener of keyListeners) {
        try {
          listener(newValue, oldValue, { key, storageType });
        } catch (error) {
          if (this.logger) {
            this.logger.warn(
              `Error in storage change listener for key '${key}'`,
              error
            );
          }
        }
      }
    }

    // ワイルドカードリスナー
    const wildcardListeners = this.changeListeners.get("*");
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(newValue, oldValue, { key, storageType });
        } catch (error) {
          if (this.logger) {
            this.logger.warn(
              `Error in wildcard storage change listener for key '${key}'`,
              error
            );
          }
        }
      }
    }
  }

  /**
   * 最適なストレージタイプを選択
   * @returns {StorageType} 選択されたストレージタイプ
   * @private
   */
  _selectStorageType() {
    // 優先ストレージタイプが利用可能な場合はそれを使用
    if (this.availableTypes.includes(this.preferredType)) {
      return this.preferredType;
    }

    // フォールバックストレージタイプを順に試す
    for (const type of this.fallbackTypes) {
      if (this.availableTypes.includes(type)) {
        if (this.logger) {
          this.logger.debug(`Falling back to ${type} storage`, {
            preferred: this.preferredType,
            available: this.availableTypes,
          });
        }
        return type;
      }
    }

    // 最終的にメモリストレージを使用
    if (this.logger) {
      this.logger.warn("No suitable storage type found, using memory storage", {
        preferred: this.preferredType,
        available: this.availableTypes,
      });
    }
    return StorageType.MEMORY;
  }

  /**
   * 名前空間付きのキーを生成
   * @param {string} key - 元のキー
   * @returns {string} 名前空間付きのキー
   * @private
   */
  _namespaceKey(key) {
    return `${this.namespace}.${key}`;
  }

  /**
   * Chrome Storage APIを使用してデータを取得
   * @param {string} key - 取得するキー
   * @param {StorageType} storageType - ストレージタイプ
   * @returns {Promise<Result<any>>} 取得結果
   * @private
   */
  async _getChromeStorage(key, storageType) {
    const namespacedKey = this._namespaceKey(key);

    try {
      // ストレージタイプに応じたChromeストレージを取得
      let storage;
      switch (storageType) {
        case StorageType.SYNC:
          storage = chrome.storage.sync;
          break;
        case StorageType.LOCAL:
          storage = chrome.storage.local;
          break;
        case StorageType.SESSION:
          storage = chrome.storage.session;
          break;
        default:
          return Result.failure(
            `Unsupported Chrome storage type: ${storageType}`,
            {
              type: ErrorType.STORAGE_ERROR,
            }
          );
      }

      // データを取得
      return new Promise((resolve) => {
        storage.get(namespacedKey, (result) => {
          if (chrome.runtime.lastError) {
            resolve(
              Result.failure(chrome.runtime.lastError.message, {
                type: ErrorType.STORAGE_ERROR,
                context: { key, storageType },
              })
            );
          } else {
            const value = result[namespacedKey];
            resolve(Result.success(value));
          }
        });
      });
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType },
      });
    }
  }

  /**
   * Chrome Storage APIを使用してデータを保存
   * @param {string} key - 保存するキー
   * @param {any} value - 保存する値
   * @param {StorageType} storageType - ストレージタイプ
   * @returns {Promise<Result<void>>} 保存結果
   * @private
   */
  async _setChromeStorage(key, value, storageType) {
    const namespacedKey = this._namespaceKey(key);

    try {
      // ストレージタイプに応じたChromeストレージを取得
      let storage;
      switch (storageType) {
        case StorageType.SYNC:
          storage = chrome.storage.sync;
          break;
        case StorageType.LOCAL:
          storage = chrome.storage.local;
          break;
        case StorageType.SESSION:
          storage = chrome.storage.session;
          break;
        default:
          return Result.failure(
            `Unsupported Chrome storage type: ${storageType}`,
            {
              type: ErrorType.STORAGE_ERROR,
            }
          );
      }

      // データを保存
      return new Promise((resolve) => {
        const data = { [namespacedKey]: value };
        storage.set(data, () => {
          if (chrome.runtime.lastError) {
            resolve(
              Result.failure(chrome.runtime.lastError.message, {
                type: ErrorType.STORAGE_ERROR,
                context: { key, storageType },
              })
            );
          } else {
            resolve(Result.success());
          }
        });
      });
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType },
      });
    }
  }

  /**
   * Chrome Storage APIを使用してデータを削除
   * @param {string} key - 削除するキー
   * @param {StorageType} storageType - ストレージタイプ
   * @returns {Promise<Result<void>>} 削除結果
   * @private
   */
  async _removeChromeStorage(key, storageType) {
    const namespacedKey = this._namespaceKey(key);

    try {
      // ストレージタイプに応じたChromeストレージを取得
      let storage;
      switch (storageType) {
        case StorageType.SYNC:
          storage = chrome.storage.sync;
          break;
        case StorageType.LOCAL:
          storage = chrome.storage.local;
          break;
        case StorageType.SESSION:
          storage = chrome.storage.session;
          break;
        default:
          return Result.failure(
            `Unsupported Chrome storage type: ${storageType}`,
            {
              type: ErrorType.STORAGE_ERROR,
            }
          );
      }

      // データを削除
      return new Promise((resolve) => {
        storage.remove(namespacedKey, () => {
          if (chrome.runtime.lastError) {
            resolve(
              Result.failure(chrome.runtime.lastError.message, {
                type: ErrorType.STORAGE_ERROR,
                context: { key, storageType },
              })
            );
          } else {
            resolve(Result.success());
          }
        });
      });
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType },
      });
    }
  }

  /**
   * Web Storage APIを使用してデータを取得
   * @param {string} key - 取得するキー
   * @param {StorageType} storageType - ストレージタイプ
   * @returns {Result<any>} 取得結果
   * @private
   */
  _getWebStorage(key, storageType) {
    const namespacedKey = this._namespaceKey(key);

    try {
      // ストレージタイプに応じたWebストレージを取得
      let storage;
      switch (storageType) {
        case StorageType.LOCAL:
          storage = localStorage;
          break;
        case StorageType.SESSION:
          storage = sessionStorage;
          break;
        default:
          return Result.failure(
            `Unsupported Web storage type: ${storageType}`,
            {
              type: ErrorType.STORAGE_ERROR,
            }
          );
      }

      // データを取得
      const serialized = storage.getItem(namespacedKey);
      if (serialized === null) {
        return Result.success(undefined);
      }

      try {
        const value = JSON.parse(serialized);
        return Result.success(value);
      } catch (parseError) {
        return Result.failure(
          `Failed to parse stored value: ${parseError.message}`,
          {
            type: ErrorType.STORAGE_ERROR,
            cause: parseError,
            context: { key, storageType },
          }
        );
      }
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType },
      });
    }
  }

  /**
   * Web Storage APIを使用してデータを保存
   * @param {string} key - 保存するキー
   * @param {any} value - 保存する値
   * @param {StorageType} storageType - ストレージタイプ
   * @returns {Result<void>} 保存結果
   * @private
   */
  _setWebStorage(key, value, storageType) {
    const namespacedKey = this._namespaceKey(key);

    try {
      // ストレージタイプに応じたWebストレージを取得
      let storage;
      switch (storageType) {
        case StorageType.LOCAL:
          storage = localStorage;
          break;
        case StorageType.SESSION:
          storage = sessionStorage;
          break;
        default:
          return Result.failure(
            `Unsupported Web storage type: ${storageType}`,
            {
              type: ErrorType.STORAGE_ERROR,
            }
          );
      }

      // データをシリアライズ
      let serialized;
      try {
        serialized = JSON.stringify(value);
      } catch (serializeError) {
        return Result.failure(
          `Failed to serialize value: ${serializeError.message}`,
          {
            type: ErrorType.STORAGE_ERROR,
            cause: serializeError,
            context: { key, storageType },
          }
        );
      }

      // データを保存
      try {
        storage.setItem(namespacedKey, serialized);
        return Result.success();
      } catch (storageError) {
        // ストレージ容量超過などのエラー
        if (
          storageError.name === "QuotaExceededError" ||
          storageError.code === 22 ||
          storageError.code === 1014
        ) {
          return Result.failure("Storage quota exceeded", {
            type: ErrorType.QUOTA_EXCEEDED_ERROR,
            cause: storageError,
            context: { key, storageType },
          });
        }
        return Result.failure(storageError, {
          type: ErrorType.STORAGE_ERROR,
          context: { key, storageType },
        });
      }
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType },
      });
    }
  }

  /**
   * Web Storage APIを使用してデータを削除
   * @param {string} key - 削除するキー
   * @param {StorageType} storageType - ストレージタイプ
   * @returns {Result<void>} 削除結果
   * @private
   */
  _removeWebStorage(key, storageType) {
    const namespacedKey = this._namespaceKey(key);

    try {
      // ストレージタイプに応じたWebストレージを取得
      let storage;
      switch (storageType) {
        case StorageType.LOCAL:
          storage = localStorage;
          break;
        case StorageType.SESSION:
          storage = sessionStorage;
          break;
        default:
          return Result.failure(
            `Unsupported Web storage type: ${storageType}`,
            {
              type: ErrorType.STORAGE_ERROR,
            }
          );
      }

      // データを削除
      storage.removeItem(namespacedKey);
      return Result.success();
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType },
      });
    }
  }

  /**
   * メモリストレージからデータを取得
   * @param {string} key - 取得するキー
   * @returns {Result<any>} 取得結果
   * @private
   */
  _getMemoryStorage(key) {
    try {
      const value = this.memoryStorage.get(key);
      return Result.success(value);
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType: StorageType.MEMORY },
      });
    }
  }

  /**
   * メモリストレージにデータを保存
   * @param {string} key - 保存するキー
   * @param {any} value - 保存する値
   * @returns {Result<void>} 保存結果
   * @private
   */
  _setMemoryStorage(key, value) {
    try {
      const oldValue = this.memoryStorage.get(key);
      this.memoryStorage.set(key, value);

      // 変更リスナーに通知
      this._notifyChangeListeners(key, value, oldValue, StorageType.MEMORY);

      return Result.success();
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType: StorageType.MEMORY },
      });
    }
  }

  /**
   * メモリストレージからデータを削除
   * @param {string} key - 削除するキー
   * @returns {Result<void>} 削除結果
   * @private
   */
  _removeMemoryStorage(key) {
    try {
      const oldValue = this.memoryStorage.get(key);
      const deleted = this.memoryStorage.delete(key);

      if (deleted) {
        // 変更リスナーに通知
        this._notifyChangeListeners(
          key,
          undefined,
          oldValue,
          StorageType.MEMORY
        );
      }

      return Result.success();
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { key, storageType: StorageType.MEMORY },
      });
    }
  }

  /**
   * データを取得
   * @param {string} key - 取得するキー
   * @param {Object} [options] - 取得オプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @param {any} [options.defaultValue] - デフォルト値
   * @returns {Promise<Result<any>>} 取得結果
   */
  async get(key, options = {}) {
    const storageType = options.storageType || this._selectStorageType();

    if (this.logger) {
      this.logger.debug(`Getting value for key '${key}'`, { storageType });
    }

    let result;

    // ストレージタイプに応じた取得処理
    switch (storageType) {
      case StorageType.SYNC:
      case StorageType.LOCAL:
      case StorageType.SESSION:
        if (typeof chrome !== "undefined" && chrome.storage) {
          result = await this._getChromeStorage(key, storageType);
        } else if (
          storageType !== StorageType.SYNC &&
          (typeof localStorage !== "undefined" ||
            typeof sessionStorage !== "undefined")
        ) {
          result = this._getWebStorage(key, storageType);
        } else {
          // フォールバック
          result = this._getMemoryStorage(key);
        }
        break;

      case StorageType.MEMORY:
      default:
        result = this._getMemoryStorage(key);
        break;
    }

    // 値が未定義でデフォルト値が指定されている場合
    if (
      result.success &&
      (result.data === undefined || result.data === null) &&
      options.defaultValue !== undefined
    ) {
      return Result.success(options.defaultValue);
    }

    return result;
  }

  /**
   * データを保存
   * @param {string} key - 保存するキー
   * @param {any} value - 保存する値
   * @param {Object} [options] - 保存オプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @returns {Promise<Result<void>>} 保存結果
   */
  async set(key, value, options = {}) {
    const storageType = options.storageType || this._selectStorageType();

    if (this.logger) {
      this.logger.debug(`Setting value for key '${key}'`, { storageType });
    }

    // ストレージタイプに応じた保存処理
    switch (storageType) {
      case StorageType.SYNC:
      case StorageType.LOCAL:
      case StorageType.SESSION:
        if (typeof chrome !== "undefined" && chrome.storage) {
          return await this._setChromeStorage(key, value, storageType);
        } else if (
          storageType !== StorageType.SYNC &&
          (typeof localStorage !== "undefined" ||
            typeof sessionStorage !== "undefined")
        ) {
          return this._setWebStorage(key, value, storageType);
        } else {
          // フォールバック
          return this._setMemoryStorage(key, value);
        }

      case StorageType.MEMORY:
      default:
        return this._setMemoryStorage(key, value);
    }
  }

  /**
   * データを削除
   * @param {string} key - 削除するキー
   * @param {Object} [options] - 削除オプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @returns {Promise<Result<void>>} 削除結果
   */
  async remove(key, options = {}) {
    const storageType = options.storageType || this._selectStorageType();

    if (this.logger) {
      this.logger.debug(`Removing value for key '${key}'`, { storageType });
    }

    // ストレージタイプに応じた削除処理
    switch (storageType) {
      case StorageType.SYNC:
      case StorageType.LOCAL:
      case StorageType.SESSION:
        if (typeof chrome !== "undefined" && chrome.storage) {
          return await this._removeChromeStorage(key, storageType);
        } else if (
          storageType !== StorageType.SYNC &&
          (typeof localStorage !== "undefined" ||
            typeof sessionStorage !== "undefined")
        ) {
          return this._removeWebStorage(key, storageType);
        } else {
          // フォールバック
          return this._removeMemoryStorage(key);
        }

      case StorageType.MEMORY:
      default:
        return this._removeMemoryStorage(key);
    }
  }

  /**
   * 変更リスナーを登録
   * @param {string} key - 監視するキー（"*"はすべてのキーを監視）
   * @param {function(any, any, Object): void} listener - 変更リスナー関数
   * @returns {function(): void} リスナー削除関数
   */
  onChange(key, listener) {
    if (!this.changeListeners.has(key)) {
      this.changeListeners.set(key, new Set());
    }

    this.changeListeners.get(key).add(listener);

    // リスナー削除関数を返す
    return () => {
      const listeners = this.changeListeners.get(key);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.changeListeners.delete(key);
        }
      }
    };
  }

  /**
   * 複数のキーを一度に取得
   * @param {Array<string>} keys - 取得するキーの配列
   * @param {Object} [options] - 取得オプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @returns {Promise<Result<Object>>} 取得結果
   */
  async getMultiple(keys, options = {}) {
    const results = {};
    const errors = [];

    // 各キーを順に取得
    for (const key of keys) {
      const result = await this.get(key, options);
      if (result.success) {
        results[key] = result.data;
      } else {
        errors.push({ key, error: result.error });
      }
    }

    // エラーがあった場合
    if (errors.length > 0) {
      if (this.logger) {
        this.logger.warn("Some keys could not be retrieved", { errors });
      }

      // 一部のキーが取得できた場合は部分的な結果を返す
      if (Object.keys(results).length > 0) {
        return Result.success(results);
      }

      // すべてのキーが取得できなかった場合はエラーを返す
      return Result.failure("Failed to retrieve multiple keys", {
        type: ErrorType.STORAGE_ERROR,
        context: { keys, errors },
      });
    }

    return Result.success(results);
  }

  /**
   * 複数のキーを一度に保存
   * @param {Object} data - 保存するキーと値のマップ
   * @param {Object} [options] - 保存オプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @returns {Promise<Result<void>>} 保存結果
   */
  async setMultiple(data, options = {}) {
    const errors = [];

    // 各キーを順に保存
    for (const [key, value] of Object.entries(data)) {
      const result = await this.set(key, value, options);
      if (!result.success) {
        errors.push({ key, error: result.error });
      }
    }

    // エラーがあった場合
    if (errors.length > 0) {
      if (this.logger) {
        this.logger.warn("Some keys could not be saved", { errors });
      }

      return Result.failure("Failed to save multiple keys", {
        type: ErrorType.STORAGE_ERROR,
        context: { keys: Object.keys(data), errors },
      });
    }

    return Result.success();
  }

  /**
   * 複数のキーを一度に削除
   * @param {Array<string>} keys - 削除するキーの配列
   * @param {Object} [options] - 削除オプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @returns {Promise<Result<void>>} 削除結果
   */
  async removeMultiple(keys, options = {}) {
    const errors = [];

    // 各キーを順に削除
    for (const key of keys) {
      const result = await this.remove(key, options);
      if (!result.success) {
        errors.push({ key, error: result.error });
      }
    }

    // エラーがあった場合
    if (errors.length > 0) {
      if (this.logger) {
        this.logger.warn("Some keys could not be removed", { errors });
      }

      return Result.failure("Failed to remove multiple keys", {
        type: ErrorType.STORAGE_ERROR,
        context: { keys, errors },
      });
    }

    return Result.success();
  }

  /**
   * 名前空間内のすべてのキーをクリア
   * @param {Object} [options] - クリアオプション
   * @param {StorageType} [options.storageType] - 使用するストレージタイプ
   * @returns {Promise<Result<void>>} クリア結果
   */
  async clear(options = {}) {
    const storageType = options.storageType || this._selectStorageType();

    if (this.logger) {
      this.logger.debug(`Clearing all keys in namespace '${this.namespace}'`, {
        storageType,
      });
    }

    try {
      // ストレージタイプに応じたクリア処理
      switch (storageType) {
        case StorageType.SYNC:
        case StorageType.LOCAL:
        case StorageType.SESSION:
          if (typeof chrome !== "undefined" && chrome.storage) {
            // Chrome Storage APIの場合
            let storage;
            switch (storageType) {
              case StorageType.SYNC:
                storage = chrome.storage.sync;
                break;
              case StorageType.LOCAL:
                storage = chrome.storage.local;
                break;
              case StorageType.SESSION:
                storage = chrome.storage.session;
                break;
            }

            // 名前空間に関連するキーを取得
            const result = await new Promise((resolve) => {
              storage.get(null, (items) => {
                if (chrome.runtime.lastError) {
                  resolve(
                    Result.failure(chrome.runtime.lastError.message, {
                      type: ErrorType.STORAGE_ERROR,
                    })
                  );
                } else {
                  resolve(Result.success(items));
                }
              });
            });

            if (!result.success) {
              return result;
            }

            // 名前空間に関連するキーをフィルタリング
            const namespacedKeys = Object.keys(result.data).filter((key) =>
              key.startsWith(`${this.namespace}.`)
            );

            if (namespacedKeys.length === 0) {
              return Result.success();
            }

            // キーを削除
            return new Promise((resolve) => {
              storage.remove(namespacedKeys, () => {
                if (chrome.runtime.lastError) {
                  resolve(
                    Result.failure(chrome.runtime.lastError.message, {
                      type: ErrorType.STORAGE_ERROR,
                    })
                  );
                } else {
                  resolve(Result.success());
                }
              });
            });
          } else if (
            storageType !== StorageType.SYNC &&
            (typeof localStorage !== "undefined" ||
              typeof sessionStorage !== "undefined")
          ) {
            // Web Storage APIの場合
            let storage;
            switch (storageType) {
              case StorageType.LOCAL:
                storage = localStorage;
                break;
              case StorageType.SESSION:
                storage = sessionStorage;
                break;
            }

            // 名前空間に関連するキーを削除
            const prefix = `${this.namespace}.`;
            const keysToRemove = [];

            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (key.startsWith(prefix)) {
                keysToRemove.push(key);
              }
            }

            // 後ろから削除（インデックスがずれるのを防ぐ）
            for (let i = keysToRemove.length - 1; i >= 0; i--) {
              storage.removeItem(keysToRemove[i]);
            }

            return Result.success();
          } else {
            // フォールバック
            return this._clearMemoryStorage();
          }

        case StorageType.MEMORY:
        default:
          return this._clearMemoryStorage();
      }
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { namespace: this.namespace, storageType },
      });
    }
  }

  /**
   * メモリストレージをクリア
   * @returns {Result<void>} クリア結果
   * @private
   */
  _clearMemoryStorage() {
    try {
      // 変更通知のために現在の値を保存
      const entries = [...this.memoryStorage.entries()];

      // メモリストレージをクリア
      this.memoryStorage.clear();

      // 変更リスナーに通知
      for (const [key, oldValue] of entries) {
        this._notifyChangeListeners(
          key,
          undefined,
          oldValue,
          StorageType.MEMORY
        );
      }

      return Result.success();
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { storageType: StorageType.MEMORY },
      });
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    StorageType,
    StorageAdapter,
  };
} else if (typeof window !== "undefined") {
  window.StorageType = StorageType;
  window.StorageAdapter = StorageAdapter;
}
