/**
 * パフォーマンス監視クラス
 * メモリ使用量、CPU使用率、レンダリング時間の監視と問題の自動検出を行う
 */
class PerformanceMonitor {
  /**
   * @param {Object} logger - ロガーインスタンス
   * @param {Object} options - 監視オプション
   */
  constructor(logger, options = {}) {
    this.logger = logger;
    this.options = {
      memoryThreshold: options.memoryThreshold || 50 * 1024 * 1024, // 50MB
      renderTimeThreshold: options.renderTimeThreshold || 16, // 16ms (60fps)
      cpuThreshold: options.cpuThreshold || 80, // 80%
      sampleInterval: options.sampleInterval || 1000, // 1秒
      alertCallback: options.alertCallback || null,
      ...options,
    };

    this.metrics = {
      memory: [],
      renderTimes: [],
      cpuUsage: [],
      frameDrops: 0,
      lastFrameTime: 0,
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.performanceObserver = null;
    this.frameId = null;

    this.initializePerformanceObserver();
  }

  /**
   * Performance Observer を初期化
   * @private
   */
  initializePerformanceObserver() {
    try {
      if ("PerformanceObserver" in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          this.processPerformanceEntries(list.getEntries());
        });
      }
    } catch (error) {
      this.logger.warn("PerformanceObserver initialization failed", error);
    }
  }

  /**
   * パフォーマンス監視を開始
   * @returns {Promise<void>}
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn("Performance monitoring is already running");
      return;
    }

    this.logger.info("Starting performance monitoring");
    this.isMonitoring = true;

    // Performance Observer を開始
    if (this.performanceObserver) {
      try {
        this.performanceObserver.observe({
          entryTypes: ["measure", "navigation", "paint", "layout-shift"],
        });
      } catch (error) {
        this.logger.warn("Failed to start PerformanceObserver", error);
      }
    }

    // 定期的なメトリクス収集を開始
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.options.sampleInterval);

    // フレームレート監視を開始
    this.startFrameRateMonitoring();
  }

  /**
   * パフォーマンス監視を停止
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info("Stopping performance monitoring");
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  /**
   * メトリクスを収集
   * @private
   */
  collectMetrics() {
    try {
      // メモリ使用量を収集
      this.collectMemoryMetrics();

      // CPU使用率を推定
      this.estimateCPUUsage();

      // パフォーマンス問題をチェック
      this.checkPerformanceIssues();
    } catch (error) {
      this.logger.error("Failed to collect metrics", error);
    }
  }

  /**
   * メモリメトリクスを収集
   * @private
   */
  collectMemoryMetrics() {
    if ("memory" in performance) {
      const memInfo = performance.memory;
      const memoryData = {
        timestamp: Date.now(),
        usedJSHeapSize: memInfo.usedJSHeapSize,
        totalJSHeapSize: memInfo.totalJSHeapSize,
        jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
      };

      this.metrics.memory.push(memoryData);

      // 古いデータを削除（最新100件を保持）
      if (this.metrics.memory.length > 100) {
        this.metrics.memory.shift();
      }

      this.logger.debug("Memory metrics collected", memoryData);
    }
  }

  /**
   * CPU使用率を推定
   * @private
   */
  estimateCPUUsage() {
    const startTime = performance.now();

    // 短時間の計算処理を実行してCPU使用率を推定
    setTimeout(() => {
      const endTime = performance.now();
      const expectedTime = 10; // 期待される処理時間（ms）
      const actualTime = endTime - startTime;

      // CPU使用率を推定（簡易的な方法）
      const cpuUsage = Math.min(100, (actualTime / expectedTime) * 100);

      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        usage: cpuUsage,
      });

      // 古いデータを削除
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage.shift();
      }
    }, 10);
  }

  /**
   * フレームレート監視を開始
   * @private
   */
  startFrameRateMonitoring() {
    const measureFrameRate = (timestamp) => {
      if (this.metrics.lastFrameTime > 0) {
        const frameTime = timestamp - this.metrics.lastFrameTime;

        this.metrics.renderTimes.push({
          timestamp: Date.now(),
          frameTime: frameTime,
        });

        // フレームドロップを検出
        if (frameTime > this.options.renderTimeThreshold) {
          this.metrics.frameDrops++;
        }

        // 古いデータを削除
        if (this.metrics.renderTimes.length > 100) {
          this.metrics.renderTimes.shift();
        }
      }

      this.metrics.lastFrameTime = timestamp;

      if (this.isMonitoring) {
        this.frameId = requestAnimationFrame(measureFrameRate);
      }
    };

    this.frameId = requestAnimationFrame(measureFrameRate);
  }

  /**
   * Performance API エントリを処理
   * @param {PerformanceEntry[]} entries - パフォーマンスエントリ
   * @private
   */
  processPerformanceEntries(entries) {
    entries.forEach((entry) => {
      switch (entry.entryType) {
        case "measure":
          this.logger.debug("Performance measure", {
            name: entry.name,
            duration: entry.duration,
          });
          break;
        case "navigation":
          this.logger.info("Navigation timing", {
            domContentLoaded:
              entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
          });
          break;
        case "paint":
          this.logger.debug("Paint timing", {
            name: entry.name,
            startTime: entry.startTime,
          });
          break;
        case "layout-shift":
          if (entry.value > 0.1) {
            // CLS threshold
            this.logger.warn("Layout shift detected", {
              value: entry.value,
              hadRecentInput: entry.hadRecentInput,
            });
          }
          break;
      }
    });
  }

  /**
   * パフォーマンス問題をチェック
   * @private
   */
  checkPerformanceIssues() {
    const issues = [];

    // メモリ使用量をチェック
    if (this.metrics.memory.length > 0) {
      const latestMemory = this.metrics.memory[this.metrics.memory.length - 1];
      if (latestMemory.usedJSHeapSize > this.options.memoryThreshold) {
        issues.push({
          type: "HIGH_MEMORY_USAGE",
          severity: "warning",
          message: `High memory usage detected: ${Math.round(
            latestMemory.usedJSHeapSize / 1024 / 1024
          )}MB`,
          data: latestMemory,
        });
      }
    }

    // CPU使用率をチェック
    if (this.metrics.cpuUsage.length > 0) {
      const latestCPU = this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1];
      if (latestCPU.usage > this.options.cpuThreshold) {
        issues.push({
          type: "HIGH_CPU_USAGE",
          severity: "warning",
          message: `High CPU usage detected: ${Math.round(latestCPU.usage)}%`,
          data: latestCPU,
        });
      }
    }

    // フレームドロップをチェック
    const recentFrameDrops = this.getRecentFrameDrops();
    if (recentFrameDrops > 10) {
      // 直近10秒で10回以上のフレームドロップ
      issues.push({
        type: "FRAME_DROPS",
        severity: "error",
        message: `Frequent frame drops detected: ${recentFrameDrops} drops`,
        data: { frameDrops: recentFrameDrops },
      });
    }

    // 問題が検出された場合はアラートを発行
    if (issues.length > 0) {
      this.handlePerformanceIssues(issues);
    }
  }

  /**
   * 直近のフレームドロップ数を取得
   * @returns {number} フレームドロップ数
   * @private
   */
  getRecentFrameDrops() {
    const tenSecondsAgo = Date.now() - 10000;
    return this.metrics.renderTimes.filter(
      (entry) =>
        entry.timestamp > tenSecondsAgo &&
        entry.frameTime > this.options.renderTimeThreshold
    ).length;
  }

  /**
   * パフォーマンス問題を処理
   * @param {Array} issues - 検出された問題
   * @private
   */
  handlePerformanceIssues(issues) {
    issues.forEach((issue) => {
      this.logger.warn("Performance issue detected", issue);
    });

    if (this.options.alertCallback) {
      try {
        this.options.alertCallback(issues);
      } catch (error) {
        this.logger.error("Alert callback failed", error);
      }
    }
  }

  /**
   * 現在のメトリクスを取得
   * @returns {Object} メトリクス情報
   */
  getMetrics() {
    return {
      memory: this.getMemoryStats(),
      cpu: this.getCPUStats(),
      rendering: this.getRenderingStats(),
      frameDrops: this.metrics.frameDrops,
      isMonitoring: this.isMonitoring,
    };
  }

  /**
   * メモリ統計を取得
   * @returns {Object} メモリ統計
   * @private
   */
  getMemoryStats() {
    if (this.metrics.memory.length === 0) {
      return null;
    }

    const latest = this.metrics.memory[this.metrics.memory.length - 1];
    const usages = this.metrics.memory.map((m) => m.usedJSHeapSize);

    return {
      current: latest.usedJSHeapSize,
      total: latest.totalJSHeapSize,
      limit: latest.jsHeapSizeLimit,
      average: usages.reduce((a, b) => a + b, 0) / usages.length,
      peak: Math.max(...usages),
    };
  }

  /**
   * CPU統計を取得
   * @returns {Object} CPU統計
   * @private
   */
  getCPUStats() {
    if (this.metrics.cpuUsage.length === 0) {
      return null;
    }

    const usages = this.metrics.cpuUsage.map((c) => c.usage);
    const latest = this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1];

    return {
      current: latest.usage,
      average: usages.reduce((a, b) => a + b, 0) / usages.length,
      peak: Math.max(...usages),
    };
  }

  /**
   * レンダリング統計を取得
   * @returns {Object} レンダリング統計
   * @private
   */
  getRenderingStats() {
    if (this.metrics.renderTimes.length === 0) {
      return null;
    }

    const frameTimes = this.metrics.renderTimes.map((r) => r.frameTime);
    const averageFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

    return {
      averageFrameTime: averageFrameTime,
      fps: 1000 / averageFrameTime,
      frameDrops: this.metrics.frameDrops,
      recentFrameDrops: this.getRecentFrameDrops(),
    };
  }

  /**
   * パフォーマンス測定を開始
   * @param {string} name - 測定名
   */
  startMeasure(name) {
    try {
      performance.mark(`${name}-start`);
    } catch (error) {
      this.logger.warn("Failed to start performance measure", error);
    }
  }

  /**
   * パフォーマンス測定を終了
   * @param {string} name - 測定名
   * @returns {number|null} 測定時間（ms）
   */
  endMeasure(name) {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const measure = performance.getEntriesByName(name, "measure")[0];
      return measure ? measure.duration : null;
    } catch (error) {
      this.logger.warn("Failed to end performance measure", error);
      return null;
    }
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics() {
    this.metrics.memory = [];
    this.metrics.renderTimes = [];
    this.metrics.cpuUsage = [];
    this.metrics.frameDrops = 0;
    this.metrics.lastFrameTime = 0;

    this.logger.info("Performance metrics cleared");
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup() {
    this.stopMonitoring();
    this.clearMetrics();

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.logger.info("PerformanceMonitor cleanup completed");
  }
}

// モジュールとしてエクスポート（Node.js環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = PerformanceMonitor;
}

// グローバルスコープに追加（ブラウザ環境用）
if (typeof window !== "undefined") {
  window.PerformanceMonitor = PerformanceMonitor;
}
