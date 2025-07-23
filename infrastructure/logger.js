/**
 * 構造化ログ機能を持つLoggerクラス
 * ログレベル管理、フィルタリング、パフォーマンス監視機能を提供
 *
 * @class Logger
 */
class Logger {
  /**
   * ログレベル定義
   * @readonly
   * @enum {number}
   */
  static LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
  };

  /**
   * ログレベル名のマッピング
   * @readonly
   * @type {Object<number, string>}
   */
  static LogLevelNames = {
    [Logger.LogLevel.ERROR]: "ERROR",
    [Logger.LogLevel.WARN]: "WARN",
    [Logger.LogLevel.INFO]: "INFO",
    [Logger.LogLevel.DEBUG]: "DEBUG",
    [Logger.LogLevel.TRACE]: "TRACE",
  };

  /**
   * ログ出力先の定義
   * @readonly
   * @enum {string}
   */
  static LogDestination = {
    CONSOLE: "console",
    MEMORY: "memory",
    CUSTOM: "custom",
  };

  /**
   * Loggerインスタンスを作成
   * @param {string} context - ログのコンテキスト名
   * @param {Object} [options] - ロガーオプション
   * @param {number} [options.level=Logger.LogLevel.INFO] - 最小ログレベル
   * @param {string|Array<string>} [options.destination=['console']] - ログ出力先
   * @param {number} [options.maxMemoryLogs=1000] - メモリに保存する最大ログ数
   * @param {Function} [options.customDestinationFn] - カスタム出力関数
   */
  constructor(context, options = {}) {
    this.context = context;
    this.level = options.level ?? Logger.LogLevel.INFO;
    this.destinations = Array.isArray(options.destination)
      ? options.destination
      : [options.destination || Logger.LogDestination.CONSOLE];

    this.performanceMarks = new Map();
    this.filters = new Set();
    this.middleware = [];

    // メモリログ用の配列
    this.memoryLogs = [];
    this.maxMemoryLogs = options.maxMemoryLogs || 1000;

    // カスタム出力関数
    this.customDestinationFn = options.customDestinationFn;

    // パフォーマンス測定用のカウンター
    this.performanceCounters = new Map();
  }

  /**
   * ログレベルを設定
   * @param {number} level - 新しいログレベル
   * @returns {Logger} メソッドチェーン用のthis
   */
  setLevel(level) {
    if (level >= Logger.LogLevel.ERROR && level <= Logger.LogLevel.TRACE) {
      this.level = level;
    }
    return this;
  }

  /**
   * ログ出力先を設定
   * @param {string|Array<string>} destinations - ログ出力先
   * @returns {Logger} メソッドチェーン用のthis
   */
  setDestinations(destinations) {
    this.destinations = Array.isArray(destinations)
      ? destinations
      : [destinations];
    return this;
  }

  /**
   * カスタム出力関数を設定
   * @param {Function} fn - カスタム出力関数
   * @returns {Logger} メソッドチェーン用のthis
   */
  setCustomDestination(fn) {
    if (typeof fn === "function") {
      this.customDestinationFn = fn;
    }
    return this;
  }

  /**
   * フィルターを追加
   * @param {string|RegExp} filter - フィルター条件
   * @returns {Logger} メソッドチェーン用のthis
   */
  addFilter(filter) {
    this.filters.add(filter);
    return this;
  }

  /**
   * フィルターを削除
   * @param {string|RegExp} filter - 削除するフィルター
   * @returns {Logger} メソッドチェーン用のthis
   */
  removeFilter(filter) {
    this.filters.delete(filter);
    return this;
  }

  /**
   * すべてのフィルターをクリア
   * @returns {Logger} メソッドチェーン用のthis
   */
  clearFilters() {
    this.filters.clear();
    return this;
  }

  /**
   * ミドルウェアを追加
   * @param {Function} middleware - ログ処理ミドルウェア
   * @returns {Logger} メソッドチェーン用のthis
   */
  addMiddleware(middleware) {
    if (typeof middleware === "function") {
      this.middleware.push(middleware);
    }
    return this;
  }

  /**
   * ミドルウェアを削除
   * @param {Function} middleware - 削除するミドルウェア
   * @returns {Logger} メソッドチェーン用のthis
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
    }
    return this;
  }

  /**
   * すべてのミドルウェアをクリア
   * @returns {Logger} メソッドチェーン用のthis
   */
  clearMiddleware() {
    this.middleware = [];
    return this;
  }

  /**
   * メッセージがフィルターを通過するかチェック
   * @param {string} message - チェック対象メッセージ
   * @returns {boolean} フィルターを通過するかどうか
   * @private
   */
  _passesFilters(message) {
    if (this.filters.size === 0) return true;

    for (const filter of this.filters) {
      if (filter instanceof RegExp) {
        if (filter.test(message)) return false;
      } else if (typeof filter === "string") {
        if (message.includes(filter)) return false;
      }
    }
    return true;
  }

  /**
   * ログエントリを作成
   * @param {number} level - ログレベル
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @returns {Object} ログエントリ
   * @private
   */
  _createLogEntry(level, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: Logger.LogLevelNames[level],
      levelValue: level,
      context: this.context,
      message,
      data: data || null,
    };

    // スタックトレース情報を追加（デバッグレベル以上の場合）
    if (level <= Logger.LogLevel.DEBUG) {
      try {
        throw new Error();
      } catch (e) {
        const stackLines = e.stack.split("\n");
        // 最初の3行（Error, _createLogEntry, _log）をスキップ
        const relevantStack = stackLines.slice(3, 8).map((line) => line.trim());
        entry.stack = relevantStack;
      }
    }

    // ミドルウェアを適用
    return this.middleware.reduce((acc, middleware) => {
      try {
        return middleware(acc) || acc;
      } catch (error) {
        console.warn("Logger middleware error:", error);
        return acc;
      }
    }, entry);
  }

  /**
   * メモリにログを保存
   * @param {Object} entry - ログエントリ
   * @private
   */
  _saveToMemory(entry) {
    this.memoryLogs.push(entry);
    // 最大数を超えた場合、古いログを削除
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.shift();
    }
  }

  /**
   * カスタム出力先にログを送信
   * @param {Object} entry - ログエントリ
   * @private
   */
  _sendToCustomDestination(entry) {
    if (typeof this.customDestinationFn === "function") {
      try {
        this.customDestinationFn(entry);
      } catch (error) {
        console.error("Error in custom log destination:", error);
      }
    }
  }

  /**
   * コンソールにログを出力
   * @param {number} level - ログレベル
   * @param {Object} entry - ログエントリ
   * @private
   */
  _logToConsole(level, entry) {
    const prefix = `[${entry.timestamp}] ${entry.level} [${entry.context}]`;

    switch (level) {
      case Logger.LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data);
        break;
      case Logger.LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case Logger.LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case Logger.LogLevel.DEBUG:
      case Logger.LogLevel.TRACE:
        console.log(prefix, entry.message, entry.data);
        break;
    }
  }

  /**
   * ログを出力
   * @param {number} level - ログレベル
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @private
   */
  _log(level, message, data) {
    if (level > this.level) return;
    if (!this._passesFilters(message)) return;

    const entry = this._createLogEntry(level, message, data);

    // 各出力先に送信
    for (const destination of this.destinations) {
      if (destination === Logger.LogDestination.CONSOLE) {
        this._logToConsole(level, entry);
      } else if (destination === Logger.LogDestination.MEMORY) {
        this._saveToMemory(entry);
      } else if (destination === Logger.LogDestination.CUSTOM) {
        this._sendToCustomDestination(entry);
      }
    }
  }

  /**
   * エラーログを出力
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @returns {Logger} メソッドチェーン用のthis
   */
  error(message, data) {
    this._log(Logger.LogLevel.ERROR, message, data);
    return this;
  }

  /**
   * 警告ログを出力
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @returns {Logger} メソッドチェーン用のthis
   */
  warn(message, data) {
    this._log(Logger.LogLevel.WARN, message, data);
    return this;
  }

  /**
   * 情報ログを出力
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @returns {Logger} メソッドチェーン用のthis
   */
  info(message, data) {
    this._log(Logger.LogLevel.INFO, message, data);
    return this;
  }

  /**
   * デバッグログを出力
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @returns {Logger} メソッドチェーン用のthis
   */
  debug(message, data) {
    this._log(Logger.LogLevel.DEBUG, message, data);
    return this;
  }

  /**
   * トレースログを出力
   * @param {string} message - ログメッセージ
   * @param {any} [data] - 追加データ
   * @returns {Logger} メソッドチェーン用のthis
   */
  trace(message, data) {
    this._log(Logger.LogLevel.TRACE, message, data);
    return this;
  }

  /**
   * パフォーマンス測定を開始
   * @param {string} name - 測定名
   * @returns {Logger} メソッドチェーン用のthis
   */
  startPerformance(name) {
    // Node.jsとブラウザ環境の両方に対応
    const now =
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    this.performanceMarks.set(name, now);
    this.debug(`Performance measurement started: ${name}`);
    return this;
  }

  /**
   * パフォーマンス測定を終了
   * @param {string} name - 測定名
   * @returns {number} 経過時間（ミリ秒）
   */
  endPerformance(name) {
    const startTime = this.performanceMarks.get(name);
    if (startTime === undefined) {
      this.warn(`Performance measurement not found: ${name}`);
      return 0;
    }

    // Node.jsとブラウザ環境の両方に対応
    const now =
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    const duration = now - startTime;
    this.performanceMarks.delete(name);

    // パフォーマンスカウンターを更新
    if (!this.performanceCounters.has(name)) {
      this.performanceCounters.set(name, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
      });
    }

    const counter = this.performanceCounters.get(name);
    counter.count++;
    counter.totalDuration += duration;
    counter.minDuration = Math.min(counter.minDuration, duration);
    counter.maxDuration = Math.max(counter.maxDuration, duration);

    this.info(`Performance measurement completed: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      count: counter.count,
      average: `${(counter.totalDuration / counter.count).toFixed(2)}ms`,
      min: `${counter.minDuration.toFixed(2)}ms`,
      max: `${counter.maxDuration.toFixed(2)}ms`,
    });

    return duration;
  }

  /**
   * 関数の実行時間を測定
   * @param {string} name - 測定名
   * @param {Function} fn - 実行する関数
   * @returns {Promise<any>|any} 関数の戻り値
   */
  async measurePerformance(name, fn) {
    this.startPerformance(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endPerformance(name);
    }
  }

  /**
   * パフォーマンス統計を取得
   * @param {string} [name] - 特定の測定名（省略時は全て）
   * @returns {Object} パフォーマンス統計
   */
  getPerformanceStats(name) {
    if (name) {
      return this.performanceCounters.get(name) || null;
    }

    const stats = {};
    for (const [key, value] of this.performanceCounters.entries()) {
      stats[key] = { ...value };
    }
    return stats;
  }

  /**
   * メモリ使用量をログ出力
   * @param {string} [label] - ラベル
   * @returns {Object|null} メモリ使用情報
   */
  logMemoryUsage(label = "Memory Usage") {
    let memory = null;

    if (typeof performance !== "undefined" && performance.memory) {
      memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      };
      this.info(label, memory);
    } else if (typeof process !== "undefined" && process.memoryUsage) {
      // Node.js環境
      const usage = process.memoryUsage();
      memory = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      };
      this.info(label, memory);
    } else {
      this.debug("Memory usage information not available");
    }

    return memory;
  }

  /**
   * メモリに保存されたログを取得
   * @param {Object} [options] - 取得オプション
   * @param {number} [options.level] - フィルタするログレベル
   * @param {string} [options.context] - フィルタするコンテキスト
   * @param {number} [options.limit] - 取得する最大数
   * @returns {Array} ログエントリの配列
   */
  getMemoryLogs(options = {}) {
    let logs = [...this.memoryLogs];

    if (options.level !== undefined) {
      logs = logs.filter((log) => log.levelValue <= options.level);
    }

    if (options.context) {
      logs = logs.filter((log) => log.context.includes(options.context));
    }

    if (options.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  /**
   * メモリログをクリア
   * @returns {Logger} メソッドチェーン用のthis
   */
  clearMemoryLogs() {
    this.memoryLogs = [];
    return this;
  }

  /**
   * 子Loggerを作成
   * @param {string} childContext - 子コンテキスト名
   * @returns {Logger} 子Loggerインスタンス
   */
  createChild(childContext) {
    const fullContext = `${this.context}.${childContext}`;

    // 親と同じオプションで子ロガーを作成
    const child = new Logger(fullContext, {
      level: this.level,
      destination: [...this.destinations],
      maxMemoryLogs: this.maxMemoryLogs,
      customDestinationFn: this.customDestinationFn,
    });

    // フィルターとミドルウェアを継承
    child.filters = new Set(this.filters);
    child.middleware = [...this.middleware];

    return child;
  }

  /**
   * 現在のロガー設定を文字列で出力
   * @returns {string} ロガー設定の文字列表現
   */
  toString() {
    return `Logger(${this.context}, level=${
      Logger.LogLevelNames[this.level]
    }, destinations=[${this.destinations.join(", ")}])`;
  }
}

// グローバルLoggerインスタンス
const globalLogger = new Logger("YouTube Theater Mode");

/**
 * 新しいロガーインスタンスを作成
 * @param {string} context - ログのコンテキスト名
 * @param {Object} [options] - ロガーオプション
 * @returns {Logger} 新しいLoggerインスタンス
 */
const createLogger = (context, options = {}) => new Logger(context, options);

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Logger, globalLogger, createLogger };
} else if (typeof window !== "undefined") {
  window.Logger = Logger;
  window.globalLogger = globalLogger;
  window.createLogger = createLogger;
}
