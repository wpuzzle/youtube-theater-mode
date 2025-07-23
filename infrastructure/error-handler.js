/**
 * エラーハンドリングとResult型パターンの実装
 * 統一されたエラー処理機構と型安全なエラーハンドリングを提供
 */

/**
 * エラー型の定義
 * @readonly
 * @enum {string}
 */
const ErrorType = {
  // システムエラー
  INITIALIZATION_ERROR: "INITIALIZATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // 通信エラー
  COMMUNICATION_ERROR: "COMMUNICATION_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",

  // ストレージエラー
  STORAGE_ERROR: "STORAGE_ERROR",
  QUOTA_EXCEEDED_ERROR: "QUOTA_EXCEEDED_ERROR",

  // 検証エラー
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TYPE_ERROR: "TYPE_ERROR",

  // DOM操作エラー
  ELEMENT_NOT_FOUND: "ELEMENT_NOT_FOUND",
  SELECTOR_ERROR: "SELECTOR_ERROR",

  // ユーザー操作エラー
  USER_INPUT_ERROR: "USER_INPUT_ERROR",
  PERMISSION_ERROR: "PERMISSION_ERROR",

  // 未知のエラー
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * エラーの重大度レベル
 * @readonly
 * @enum {number}
 */
const ErrorSeverity = {
  FATAL: 0, // 致命的なエラー、アプリケーションの継続が不可能
  ERROR: 1, // 重大なエラー、機能が使用不可
  WARNING: 2, // 警告、機能は制限付きで使用可能
  INFO: 3, // 情報提供のみ、機能は正常に動作
};

/**
 * 構造化されたエラー情報
 */
class AppError extends Error {
  /**
   * AppErrorインスタンスを作成
   * @param {string} message - エラーメッセージ
   * @param {Object} options - エラーオプション
   * @param {string} [options.type=ErrorType.UNKNOWN_ERROR] - エラータイプ
   * @param {number} [options.severity=ErrorSeverity.ERROR] - エラーの重大度
   * @param {Error} [options.cause] - 原因となったエラー
   * @param {Object} [options.context] - エラーのコンテキスト情報
   * @param {string} [options.code] - エラーコード
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.type = options.type || ErrorType.UNKNOWN_ERROR;
    this.severity =
      options.severity !== undefined ? options.severity : ErrorSeverity.ERROR;
    this.cause = options.cause;
    this.context = options.context || {};
    this.code = options.code;
    this.timestamp = new Date();

    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * エラーの文字列表現を取得
   * @returns {string} エラーの文字列表現
   */
  toString() {
    return `[${this.type}] ${this.message}${
      this.code ? ` (${this.code})` : ""
    }`;
  }

  /**
   * エラーをJSONシリアライズ可能なオブジェクトに変換
   * @returns {Object} JSONシリアライズ可能なエラーオブジェクト
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause
        ? this.cause.toJSON
          ? this.cause.toJSON()
          : String(this.cause)
        : undefined,
    };
  }
}

/**
 * Result型パターンの実装
 * 成功または失敗の結果を表現する
 * @template T
 */
class Result {
  /**
   * @param {boolean} success - 成功フラグ
   * @param {T} [data] - 成功時のデータ
   * @param {AppError} [error] - 失敗時のエラー
   * @private
   */
  constructor(success, data, error) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  /**
   * 成功結果を作成
   * @template T
   * @param {T} data - 成功データ
   * @returns {Result<T>} 成功結果
   * @static
   */
  static success(data) {
    return new Result(true, data);
  }

  /**
   * 失敗結果を作成
   * @param {AppError|Error|string} error - エラーオブジェクトまたはメッセージ
   * @param {Object} [options] - エラーオプション（文字列の場合）
   * @returns {Result<never>} 失敗結果
   * @static
   */
  static failure(error, options) {
    if (typeof error === "string") {
      error = new AppError(error, options || {});
    } else if (!(error instanceof AppError)) {
      error = new AppError(error.message, {
        cause: error,
        ...options,
      });
    }
    return new Result(false, undefined, error);
  }

  /**
   * 結果が成功かどうかを確認
   * @returns {boolean} 成功かどうか
   */
  isSuccess() {
    return this.success;
  }

  /**
   * 結果が失敗かどうかを確認
   * @returns {boolean} 失敗かどうか
   */
  isFailure() {
    return !this.success;
  }

  /**
   * 成功時にコールバックを実行
   * @param {function(T): any} callback - 成功時に実行するコールバック
   * @returns {Result<T>} this
   */
  onSuccess(callback) {
    if (this.success && callback) {
      callback(this.data);
    }
    return this;
  }

  /**
   * 失敗時にコールバックを実行
   * @param {function(AppError): any} callback - 失敗時に実行するコールバック
   * @returns {Result<T>} this
   */
  onFailure(callback) {
    if (!this.success && callback) {
      callback(this.error);
    }
    return this;
  }

  /**
   * 成功時に新しい結果に変換
   * @template U
   * @param {function(T): Result<U>} callback - 変換関数
   * @returns {Result<U>} 新しい結果
   */
  flatMap(callback) {
    if (!this.success) {
      return this;
    }
    try {
      return callback(this.data);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * 成功時にデータを変換
   * @template U
   * @param {function(T): U} callback - 変換関数
   * @returns {Result<U>} 変換された結果
   */
  map(callback) {
    if (!this.success) {
      return this;
    }
    try {
      return Result.success(callback(this.data));
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * 結果からデータを取得（失敗時は例外をスロー）
   * @returns {T} 成功データ
   * @throws {AppError} 失敗時のエラー
   */
  unwrap() {
    if (!this.success) {
      throw this.error;
    }
    return this.data;
  }

  /**
   * 結果からデータを取得（失敗時はデフォルト値を返す）
   * @param {T} defaultValue - デフォルト値
   * @returns {T} 成功データまたはデフォルト値
   */
  unwrapOr(defaultValue) {
    return this.success ? this.data : defaultValue;
  }

  /**
   * 結果を文字列に変換
   * @returns {string} 結果の文字列表現
   */
  toString() {
    if (this.success) {
      return `Success: ${JSON.stringify(this.data)}`;
    } else {
      return `Failure: ${this.error}`;
    }
  }
}

/**
 * エラーハンドリングユーティリティ
 */
class ErrorHandler {
  /**
   * ErrorHandlerインスタンスを作成
   * @param {Object} logger - ロガーインスタンス
   */
  constructor(logger) {
    this.logger = logger;
    this.errorListeners = new Set();
    this.errorTypeHandlers = new Map();
  }

  /**
   * エラーリスナーを登録
   * @param {function(AppError): void} listener - エラーリスナー関数
   * @returns {function()} リスナー削除関数
   */
  addErrorListener(listener) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * 特定のエラータイプに対するハンドラーを登録
   * @param {string} errorType - エラータイプ
   * @param {function(AppError): void} handler - エラーハンドラー関数
   */
  registerTypeHandler(errorType, handler) {
    this.errorTypeHandlers.set(errorType, handler);
  }

  /**
   * エラーを処理
   * @param {AppError|Error|string} error - エラーオブジェクトまたはメッセージ
   * @param {Object} [options] - エラーオプション（文字列の場合）
   * @returns {AppError} 処理されたエラー
   */
  handleError(error, options) {
    // エラーをAppError形式に変換
    const appError = this._normalizeError(error, options);

    // エラーをログに記録
    this._logError(appError);

    // 登録されたリスナーに通知
    this._notifyListeners(appError);

    // タイプ固有のハンドラーを実行
    this._executeTypeHandler(appError);

    return appError;
  }

  /**
   * 非同期処理をResult型でラップ
   * @template T
   * @param {Promise<T>} promise - 対象Promise
   * @param {Object} [options] - エラーオプション
   * @returns {Promise<Result<T>>} Result型Promise
   */
  async wrapAsync(promise, options = {}) {
    try {
      const data = await promise;
      return Result.success(data);
    } catch (error) {
      const appError = this._normalizeError(error, options);
      this._logError(appError);
      return Result.failure(appError);
    }
  }

  /**
   * 同期処理をResult型でラップ
   * @template T
   * @param {function(): T} fn - 実行する関数
   * @param {Object} [options] - エラーオプション
   * @returns {Result<T>} 結果
   */
  wrapSync(fn, options = {}) {
    try {
      const data = fn();
      return Result.success(data);
    } catch (error) {
      const appError = this._normalizeError(error, options);
      this._logError(appError);
      return Result.failure(appError);
    }
  }

  /**
   * エラーを分類して適切に処理
   * @param {Error} error - エラーオブジェクト
   * @returns {string} エラータイプ
   * @private
   */
  _categorizeError(error) {
    // エラーメッセージに基づいて分類
    const message = error.message.toLowerCase();

    if (error.name === "TypeError") {
      return ErrorType.TYPE_ERROR;
    }

    if (message.includes("storage") || message.includes("quota")) {
      return message.includes("quota")
        ? ErrorType.QUOTA_EXCEEDED_ERROR
        : ErrorType.STORAGE_ERROR;
    }

    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout")
    ) {
      return message.includes("timeout")
        ? ErrorType.TIMEOUT_ERROR
        : ErrorType.COMMUNICATION_ERROR;
    }

    if (
      message.includes("element") ||
      message.includes("selector") ||
      message.includes("dom")
    ) {
      return message.includes("selector")
        ? ErrorType.SELECTOR_ERROR
        : ErrorType.ELEMENT_NOT_FOUND;
    }

    if (message.includes("permission") || message.includes("access")) {
      return ErrorType.PERMISSION_ERROR;
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorType.VALIDATION_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   * @param {AppError} error - エラーオブジェクト
   * @returns {string} ユーザー向けメッセージ
   */
  getUserMessage(error) {
    // エラータイプに基づいてユーザーフレンドリーなメッセージを返す
    switch (error.type) {
      case ErrorType.INITIALIZATION_ERROR:
        return "拡張機能の初期化中にエラーが発生しました。ページを再読み込みしてください。";

      case ErrorType.COMMUNICATION_ERROR:
        return "通信エラーが発生しました。インターネット接続を確認してください。";

      case ErrorType.TIMEOUT_ERROR:
        return "操作がタイムアウトしました。後でもう一度お試しください。";

      case ErrorType.STORAGE_ERROR:
      case ErrorType.QUOTA_EXCEEDED_ERROR:
        return "データの保存中にエラーが発生しました。ブラウザのストレージ容量を確認してください。";

      case ErrorType.ELEMENT_NOT_FOUND:
      case ErrorType.SELECTOR_ERROR:
        return "ページ要素の検出に失敗しました。YouTubeのレイアウトが変更された可能性があります。";

      case ErrorType.PERMISSION_ERROR:
        return "この操作を実行するための権限がありません。";

      case ErrorType.VALIDATION_ERROR:
      case ErrorType.TYPE_ERROR:
      case ErrorType.USER_INPUT_ERROR:
        return "入力データが無効です。入力内容を確認してください。";

      case ErrorType.INTERNAL_ERROR:
      case ErrorType.UNKNOWN_ERROR:
      default:
        return "予期しないエラーが発生しました。問題が解決しない場合は、拡張機能を再インストールしてください。";
    }
  }

  /**
   * エラーをAppError形式に正規化
   * @param {AppError|Error|string} error - エラーオブジェクトまたはメッセージ
   * @param {Object} [options] - エラーオプション（文字列の場合）
   * @returns {AppError} 正規化されたエラー
   * @private
   */
  _normalizeError(error, options = {}) {
    if (error instanceof AppError) {
      return error;
    }

    if (typeof error === "string") {
      return new AppError(error, options);
    }

    // 通常のErrorオブジェクトをAppErrorに変換
    const errorType = options.type || this._categorizeError(error);
    return new AppError(error.message, {
      type: errorType,
      cause: error,
      ...options,
    });
  }

  /**
   * エラーをログに記録
   * @param {AppError} error - エラーオブジェクト
   * @private
   */
  _logError(error) {
    if (!this.logger) return;

    const logData = {
      type: error.type,
      code: error.code,
      context: error.context,
      stack: error.stack,
      cause: error.cause,
    };

    // 重大度に応じてログレベルを変更
    switch (error.severity) {
      case ErrorSeverity.FATAL:
      case ErrorSeverity.ERROR:
        this.logger.error(error.message, logData);
        break;
      case ErrorSeverity.WARNING:
        this.logger.warn(error.message, logData);
        break;
      case ErrorSeverity.INFO:
        this.logger.info(error.message, logData);
        break;
    }
  }

  /**
   * 登録されたリスナーにエラーを通知
   * @param {AppError} error - エラーオブジェクト
   * @private
   */
  _notifyListeners(error) {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (listenerError) {
        if (this.logger) {
          this.logger.warn("Error in error listener", listenerError);
        }
      }
    }
  }

  /**
   * タイプ固有のハンドラーを実行
   * @param {AppError} error - エラーオブジェクト
   * @private
   */
  _executeTypeHandler(error) {
    const handler = this.errorTypeHandlers.get(error.type);
    if (handler) {
      try {
        handler(error);
      } catch (handlerError) {
        if (this.logger) {
          this.logger.warn(`Error in handler for ${error.type}`, handlerError);
        }
      }
    }
  }
}

/**
 * リトライ機構
 */
class RetryManager {
  /**
   * RetryManagerインスタンスを作成
   * @param {Object} options - リトライオプション
   * @param {number} [options.maxRetries=3] - 最大リトライ回数
   * @param {number} [options.baseDelay=1000] - 基本遅延時間（ミリ秒）
   * @param {number} [options.maxDelay=30000] - 最大遅延時間（ミリ秒）
   * @param {function(Error): boolean} [options.retryCondition] - リトライ条件関数
   * @param {Object} [options.logger] - ロガーインスタンス
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.retryCondition = options.retryCondition;
    this.logger = options.logger;
  }

  /**
   * リトライ付きで処理を実行
   * @template T
   * @param {function(): Promise<T>} operation - 実行する処理
   * @param {Object} [options] - 実行オプション
   * @param {number} [options.maxRetries] - このオペレーション用の最大リトライ回数
   * @param {function(Error, number): boolean} [options.retryCondition] - このオペレーション用のリトライ条件
   * @param {function(number): void} [options.onRetry] - リトライ時のコールバック
   * @returns {Promise<Result<T>>} 実行結果
   */
  async withRetry(operation, options = {}) {
    const maxRetries =
      options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    const retryCondition = options.retryCondition || this.retryCondition;
    let attempt = 0;

    while (true) {
      try {
        const result = await operation();
        return Result.success(result);
      } catch (error) {
        attempt++;

        // 最大リトライ回数に達した場合
        if (attempt > maxRetries) {
          if (this.logger) {
            this.logger.warn(
              `Operation failed after ${attempt} attempts`,
              error
            );
          }
          return Result.failure(error, { context: { attempts: attempt } });
        }

        // リトライ条件をチェック
        if (retryCondition && !retryCondition(error, attempt)) {
          if (this.logger) {
            this.logger.info(`Retry condition not met, aborting retries`, {
              error,
              attempt,
            });
          }
          return Result.failure(error, { context: { attempts: attempt } });
        }

        // 指数バックオフで待機
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );

        if (this.logger) {
          this.logger.info(
            `Retry attempt ${attempt}/${maxRetries} after ${delay}ms`,
            { error: error.message }
          );
        }

        if (options.onRetry) {
          options.onRetry(attempt);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ErrorType,
    ErrorSeverity,
    AppError,
    Result,
    ErrorHandler,
    RetryManager,
  };
} else if (typeof window !== "undefined") {
  window.ErrorType = ErrorType;
  window.ErrorSeverity = ErrorSeverity;
  window.AppError = AppError;
  window.Result = Result;
  window.ErrorHandler = ErrorHandler;
  window.RetryManager = RetryManager;
}
