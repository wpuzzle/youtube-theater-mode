/**
 * DataValidator
 * 入力データの検証とサニタイゼーション機能を提供
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
 * データ型の定義
 * @readonly
 * @enum {string}
 */
const DataType = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  OBJECT: "object",
  ARRAY: "array",
  DATE: "date",
  ANY: "any",
};

/**
 * バリデーションルールの型
 * @typedef {Object} ValidationRule
 * @property {DataType} type - データ型
 * @property {boolean} [required=false] - 必須かどうか
 * @property {any} [default] - デフォルト値
 * @property {number} [min] - 最小値（数値）または最小長（文字列・配列）
 * @property {number} [max] - 最大値（数値）または最大長（文字列・配列）
 * @property {RegExp} [pattern] - 文字列のパターン
 * @property {Array<any>} [enum] - 許容される値のリスト
 * @property {Object<string, ValidationRule>} [properties] - オブジェクトのプロパティルール
 * @property {ValidationRule} [items] - 配列の要素ルール
 * @property {Function} [custom] - カスタムバリデーション関数
 * @property {string} [description] - ルールの説明
 */

/**
 * バリデーション結果の型
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 検証結果
 * @property {Array<Object>} [errors] - エラー情報
 * @property {any} [value] - 検証・変換後の値
 */

/**
 * データバリデータ
 * スキーマベースのデータ検証とサニタイゼーション
 */
class DataValidator {
  /**
   * DataValidatorインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;

    // スキーマ登録用のマップ
    this.schemas = new Map();

    // サニタイザー関数
    this.sanitizers = new Map([
      [DataType.STRING, this._sanitizeString.bind(this)],
      [DataType.NUMBER, this._sanitizeNumber.bind(this)],
      [DataType.BOOLEAN, this._sanitizeBoolean.bind(this)],
      [DataType.OBJECT, this._sanitizeObject.bind(this)],
      [DataType.ARRAY, this._sanitizeArray.bind(this)],
      [DataType.DATE, this._sanitizeDate.bind(this)],
    ]);

    if (this.logger) {
      this.logger.debug("DataValidator initialized");
    }
  }

  /**
   * スキーマを登録
   * @param {string} name - スキーマ名
   * @param {Object<string, ValidationRule>} schema - バリデーションスキーマ
   * @returns {DataValidator} メソッドチェーン用のthis
   */
  registerSchema(name, schema) {
    if (!name || typeof name !== "string") {
      throw new Error("Schema name must be a non-empty string");
    }

    if (!schema || typeof schema !== "object") {
      throw new Error("Schema must be an object");
    }

    this.schemas.set(name, schema);

    if (this.logger) {
      this.logger.debug(`Schema '${name}' registered`, {
        schemaProperties: Object.keys(schema),
      });
    }

    return this;
  }

  /**
   * スキーマを取得
   * @param {string} name - スキーマ名
   * @returns {Object<string, ValidationRule>|null} スキーマまたはnull
   */
  getSchema(name) {
    return this.schemas.has(name) ? { ...this.schemas.get(name) } : null;
  }

  /**
   * スキーマを削除
   * @param {string} name - スキーマ名
   * @returns {boolean} 削除成功かどうか
   */
  removeSchema(name) {
    const result = this.schemas.delete(name);

    if (result && this.logger) {
      this.logger.debug(`Schema '${name}' removed`);
    }

    return result;
  }

  /**
   * 登録されているスキーマ名の一覧を取得
   * @returns {Array<string>} スキーマ名の配列
   */
  getSchemaNames() {
    return Array.from(this.schemas.keys());
  }

  /**
   * データを検証
   * @param {any} data - 検証対象データ
   * @param {Object<string, ValidationRule>|string} schema - バリデーションスキーマまたはスキーマ名
   * @param {Object} [options] - オプション
   * @param {boolean} [options.sanitize=false] - サニタイズするかどうか
   * @returns {Result<ValidationResult>} 検証結果
   */
  validate(data, schema, options = {}) {
    try {
      // スキーマ名が指定された場合は登録済みスキーマを使用
      if (typeof schema === "string") {
        const namedSchema = this.getSchema(schema);
        if (!namedSchema) {
          return Result.failure(`Schema '${schema}' not found`, {
            type: ErrorType.VALIDATION_ERROR,
          });
        }
        schema = namedSchema;
      }

      // 検証オプション
      const sanitize =
        options.sanitize !== undefined ? options.sanitize : false;

      // 検証結果
      const result = {
        valid: true,
        errors: [],
        value: data,
      };

      // データがnullまたはundefinedの場合
      if (data === null || data === undefined) {
        // 必須プロパティがあるか確認
        const requiredProps = Object.entries(schema).filter(
          ([_, rule]) => rule.required
        );

        if (requiredProps.length > 0) {
          result.valid = false;
          result.errors.push({
            path: "",
            message: "Data is required but received null or undefined",
            code: "required",
          });

          return Result.success(result);
        }

        // サニタイズが有効な場合はデフォルト値を使用
        if (sanitize) {
          result.value = this._createDefaultObject(schema);
        }

        return Result.success(result);
      }

      // オブジェクトの各プロパティを検証
      for (const [key, rule] of Object.entries(schema)) {
        const value = data[key];
        const path = key;

        // プロパティが存在しない場合
        if (value === undefined || value === null) {
          // 必須プロパティの場合はエラー
          if (rule.required) {
            result.valid = false;
            result.errors.push({
              path,
              message: `Required property '${key}' is missing`,
              code: "required",
            });
            continue;
          }

          // サニタイズが有効な場合はデフォルト値を使用
          if (sanitize && rule.default !== undefined) {
            if (result.value === data) {
              result.value = { ...data };
            }
            result.value[key] = this._deepCopy(rule.default);
          }

          continue;
        }

        // プロパティの型を検証
        const typeResult = this._validateType(value, rule, path);
        if (!typeResult.valid) {
          result.valid = false;
          result.errors.push(...typeResult.errors);

          // サニタイズが有効な場合は型変換を試みる
          if (sanitize) {
            if (result.value === data) {
              result.value = { ...data };
            }

            const sanitizer = this.sanitizers.get(rule.type);
            if (sanitizer) {
              const sanitized = sanitizer(value, rule);
              if (sanitized.success) {
                result.value[key] = sanitized.data;
              } else if (rule.default !== undefined) {
                result.value[key] = this._deepCopy(rule.default);
              }
            } else if (rule.default !== undefined) {
              result.value[key] = this._deepCopy(rule.default);
            }
          }

          continue;
        }

        // 型に応じた追加の検証
        const valueResult = this._validateValue(value, rule, path);
        if (!valueResult.valid) {
          result.valid = false;
          result.errors.push(...valueResult.errors);

          // サニタイズが有効な場合は値を調整
          if (sanitize) {
            if (result.value === data) {
              result.value = { ...data };
            }

            // 範囲外の値を調整
            if (rule.type === DataType.NUMBER) {
              if (rule.min !== undefined && value < rule.min) {
                result.value[key] = rule.min;
              } else if (rule.max !== undefined && value > rule.max) {
                result.value[key] = rule.max;
              }
            } else if (rule.type === DataType.STRING) {
              if (
                rule.maxLength !== undefined &&
                value.length > rule.maxLength
              ) {
                result.value[key] = value.substring(0, rule.maxLength);
              }
            } else if (rule.type === DataType.ARRAY) {
              if (rule.maxItems !== undefined && value.length > rule.maxItems) {
                result.value[key] = value.slice(0, rule.maxItems);
              }
            } else if (rule.enum !== undefined && !rule.enum.includes(value)) {
              result.value[key] =
                rule.default !== undefined ? rule.default : rule.enum[0];
            }
          }
        }

        // オブジェクトの場合は再帰的に検証
        if (rule.type === DataType.OBJECT && rule.properties) {
          const nestedResult = this.validate(value, rule.properties, options);

          if (nestedResult.isFailure()) {
            return nestedResult;
          }

          if (!nestedResult.data.valid) {
            result.valid = false;

            // パスを親プロパティに修正
            const nestedErrors = nestedResult.data.errors.map((err) => ({
              ...err,
              path: `${path}.${err.path}`,
            }));

            result.errors.push(...nestedErrors);

            // サニタイズが有効な場合は値を更新
            if (sanitize) {
              if (result.value === data) {
                result.value = { ...data };
              }
              result.value[key] = nestedResult.data.value;
            }
          }
        }

        // 配列の場合は要素を検証
        if (rule.type === DataType.ARRAY && rule.items) {
          const arrayResult = this._validateArray(value, rule, path);

          if (!arrayResult.valid) {
            result.valid = false;
            result.errors.push(...arrayResult.errors);

            // サニタイズが有効な場合は値を更新
            if (sanitize && arrayResult.value) {
              if (result.value === data) {
                result.value = { ...data };
              }
              result.value[key] = arrayResult.value;
            }
          }
        }

        // カスタムバリデーション
        if (rule.custom && typeof rule.custom === "function") {
          try {
            const customResult = rule.custom(value);

            if (
              customResult === false ||
              (customResult && customResult.valid === false)
            ) {
              result.valid = false;

              const errorMessage =
                customResult && customResult.message
                  ? customResult.message
                  : `Custom validation failed for '${key}'`;

              result.errors.push({
                path,
                message: errorMessage,
                code: "custom",
              });
            }
          } catch (error) {
            if (this.logger) {
              this.logger.warn(`Error in custom validator for '${key}'`, error);
            }

            result.valid = false;
            result.errors.push({
              path,
              message: `Custom validator error: ${error.message}`,
              code: "custom_error",
            });
          }
        }
      }

      return Result.success(result);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error validating data", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "validate" },
          type: ErrorType.VALIDATION_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.VALIDATION_ERROR,
      });
    }
  }

  /**
   * データをサニタイズ
   * @param {any} data - サニタイズ対象データ
   * @param {Object<string, ValidationRule>|string} schema - バリデーションスキーマまたはスキーマ名
   * @returns {Result<any>} サニタイズ結果
   */
  sanitize(data, schema) {
    try {
      // スキーマ名が指定された場合は登録済みスキーマを使用
      if (typeof schema === "string") {
        const namedSchema = this.getSchema(schema);
        if (!namedSchema) {
          return Result.failure(`Schema '${schema}' not found`, {
            type: ErrorType.VALIDATION_ERROR,
          });
        }
        schema = namedSchema;
      }

      // 検証とサニタイズを実行
      const result = this.validate(data, schema, { sanitize: true });

      if (result.isFailure()) {
        return result;
      }

      return Result.success(result.data.value);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error sanitizing data", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "sanitize" },
          type: ErrorType.VALIDATION_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.VALIDATION_ERROR,
      });
    }
  }

  /**
   * 型を検証
   * @param {any} value - 検証対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @param {string} path - プロパティパス
   * @returns {ValidationResult} 検証結果
   * @private
   */
  _validateType(value, rule, path) {
    const result = {
      valid: true,
      errors: [],
    };

    // ANY型は常に有効
    if (rule.type === DataType.ANY) {
      return result;
    }

    let isValid = false;

    switch (rule.type) {
      case DataType.STRING:
        isValid = typeof value === "string";
        break;

      case DataType.NUMBER:
        isValid = typeof value === "number" && !isNaN(value);
        break;

      case DataType.BOOLEAN:
        isValid = typeof value === "boolean";
        break;

      case DataType.OBJECT:
        isValid =
          typeof value === "object" && value !== null && !Array.isArray(value);
        break;

      case DataType.ARRAY:
        isValid = Array.isArray(value);
        break;

      case DataType.DATE:
        isValid = value instanceof Date && !isNaN(value.getTime());
        break;

      default:
        isValid = false;
    }

    if (!isValid) {
      result.valid = false;
      result.errors.push({
        path,
        message: `Invalid type for '${path}': expected ${rule.type}`,
        code: "type",
        expected: rule.type,
        actual: Array.isArray(value) ? "array" : typeof value,
      });
    }

    return result;
  }

  /**
   * 値を検証
   * @param {any} value - 検証対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @param {string} path - プロパティパス
   * @returns {ValidationResult} 検証結果
   * @private
   */
  _validateValue(value, rule, path) {
    const result = {
      valid: true,
      errors: [],
    };

    // 数値の範囲チェック
    if (rule.type === DataType.NUMBER) {
      if (rule.min !== undefined && value < rule.min) {
        result.valid = false;
        result.errors.push({
          path,
          message: `Value for '${path}' is below minimum: ${rule.min}`,
          code: "min",
          min: rule.min,
          value,
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        result.valid = false;
        result.errors.push({
          path,
          message: `Value for '${path}' exceeds maximum: ${rule.max}`,
          code: "max",
          max: rule.max,
          value,
        });
      }
    }

    // 文字列の長さチェック
    if (rule.type === DataType.STRING) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        result.valid = false;
        result.errors.push({
          path,
          message: `String '${path}' is too short (min: ${rule.minLength})`,
          code: "minLength",
          minLength: rule.minLength,
          length: value.length,
        });
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        result.valid = false;
        result.errors.push({
          path,
          message: `String '${path}' is too long (max: ${rule.maxLength})`,
          code: "maxLength",
          maxLength: rule.maxLength,
          length: value.length,
        });
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        result.valid = false;
        result.errors.push({
          path,
          message: `String '${path}' does not match required pattern`,
          code: "pattern",
          pattern: rule.pattern.toString(),
        });
      }
    }

    // 配列の長さチェック
    if (rule.type === DataType.ARRAY) {
      if (rule.minItems !== undefined && value.length < rule.minItems) {
        result.valid = false;
        result.errors.push({
          path,
          message: `Array '${path}' has too few items (min: ${rule.minItems})`,
          code: "minItems",
          minItems: rule.minItems,
          length: value.length,
        });
      }

      if (rule.maxItems !== undefined && value.length > rule.maxItems) {
        result.valid = false;
        result.errors.push({
          path,
          message: `Array '${path}' has too many items (max: ${rule.maxItems})`,
          code: "maxItems",
          maxItems: rule.maxItems,
          length: value.length,
        });
      }
    }

    // 列挙型チェック
    if (rule.enum !== undefined && !rule.enum.includes(value)) {
      result.valid = false;
      result.errors.push({
        path,
        message: `Value for '${path}' must be one of: ${rule.enum.join(", ")}`,
        code: "enum",
        allowed: rule.enum,
        value,
      });
    }

    return result;
  }

  /**
   * 配列を検証
   * @param {Array} array - 検証対象配列
   * @param {ValidationRule} rule - バリデーションルール
   * @param {string} path - プロパティパス
   * @returns {ValidationResult} 検証結果
   * @private
   */
  _validateArray(array, rule, path) {
    const result = {
      valid: true,
      errors: [],
      value: array,
    };

    if (!rule.items) {
      return result;
    }

    const sanitizedArray = rule.items.type !== DataType.ANY ? [] : null;

    for (let i = 0; i < array.length; i++) {
      const itemPath = `${path}[${i}]`;
      const item = array[i];

      // 要素の型を検証
      const typeResult = this._validateType(item, rule.items, itemPath);
      if (!typeResult.valid) {
        result.valid = false;
        result.errors.push(...typeResult.errors);

        // サニタイズが有効な場合は型変換を試みる
        if (sanitizedArray !== null) {
          const sanitizer = this.sanitizers.get(rule.items.type);
          if (sanitizer) {
            const sanitized = sanitizer(item, rule.items);
            if (sanitized.success) {
              sanitizedArray.push(sanitized.data);
            } else if (rule.items.default !== undefined) {
              sanitizedArray.push(this._deepCopy(rule.items.default));
            } else {
              sanitizedArray.push(null);
            }
          } else {
            sanitizedArray.push(null);
          }
        }

        continue;
      }

      // 要素の値を検証
      const valueResult = this._validateValue(item, rule.items, itemPath);
      if (!valueResult.valid) {
        result.valid = false;
        result.errors.push(...valueResult.errors);

        // サニタイズが有効な場合は値を調整
        if (sanitizedArray !== null) {
          if (rule.items.type === DataType.NUMBER) {
            if (rule.items.min !== undefined && item < rule.items.min) {
              sanitizedArray.push(rule.items.min);
            } else if (rule.items.max !== undefined && item > rule.items.max) {
              sanitizedArray.push(rule.items.max);
            } else {
              sanitizedArray.push(item);
            }
          } else if (rule.items.type === DataType.STRING) {
            if (
              rule.items.maxLength !== undefined &&
              item.length > rule.items.maxLength
            ) {
              sanitizedArray.push(item.substring(0, rule.items.maxLength));
            } else {
              sanitizedArray.push(item);
            }
          } else if (
            rule.items.enum !== undefined &&
            !rule.items.enum.includes(item)
          ) {
            sanitizedArray.push(
              rule.items.default !== undefined
                ? rule.items.default
                : rule.items.enum[0]
            );
          } else {
            sanitizedArray.push(item);
          }
        }

        continue;
      }

      // オブジェクトの場合は再帰的に検証
      if (rule.items.type === DataType.OBJECT && rule.items.properties) {
        const nestedResult = this.validate(item, rule.items.properties, {
          sanitize: sanitizedArray !== null,
        });

        if (nestedResult.isFailure()) {
          result.valid = false;
          continue;
        }

        if (!nestedResult.data.valid) {
          result.valid = false;

          // パスを親プロパティに修正
          const nestedErrors = nestedResult.data.errors.map((err) => ({
            ...err,
            path: `${itemPath}.${err.path}`,
          }));

          result.errors.push(...nestedErrors);

          // サニタイズが有効な場合は値を更新
          if (sanitizedArray !== null) {
            sanitizedArray.push(nestedResult.data.value);
          }
        } else if (sanitizedArray !== null) {
          sanitizedArray.push(nestedResult.data.value);
        }
      } else if (sanitizedArray !== null) {
        sanitizedArray.push(item);
      }
    }

    if (sanitizedArray !== null) {
      result.value = sanitizedArray;
    }

    return result;
  }

  /**
   * 文字列をサニタイズ
   * @param {any} value - サニタイズ対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @returns {Result<string>} サニタイズ結果
   * @private
   */
  _sanitizeString(value, rule) {
    try {
      // nullまたはundefinedの場合はデフォルト値を使用
      if (value === null || value === undefined) {
        return Result.success(rule.default !== undefined ? rule.default : "");
      }

      // 文字列に変換
      let sanitized = String(value);

      // 長さ制限
      if (rule.maxLength !== undefined && sanitized.length > rule.maxLength) {
        sanitized = sanitized.substring(0, rule.maxLength);
      }

      // パターンチェック
      if (rule.pattern && !rule.pattern.test(sanitized)) {
        return Result.success(rule.default !== undefined ? rule.default : "");
      }

      // 列挙型チェック
      if (rule.enum !== undefined && !rule.enum.includes(sanitized)) {
        return Result.success(
          rule.default !== undefined ? rule.default : rule.enum[0]
        );
      }

      return Result.success(sanitized);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * 数値をサニタイズ
   * @param {any} value - サニタイズ対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @returns {Result<number>} サニタイズ結果
   * @private
   */
  _sanitizeNumber(value, rule) {
    try {
      // nullまたはundefinedの場合はデフォルト値を使用
      if (value === null || value === undefined) {
        return Result.success(rule.default !== undefined ? rule.default : 0);
      }

      // 数値に変換
      let sanitized = Number(value);

      // NaNの場合はデフォルト値を使用
      if (isNaN(sanitized)) {
        return Result.success(rule.default !== undefined ? rule.default : 0);
      }

      // 範囲制限
      if (rule.min !== undefined) {
        sanitized = Math.max(rule.min, sanitized);
      }

      if (rule.max !== undefined) {
        sanitized = Math.min(rule.max, sanitized);
      }

      // 列挙型チェック
      if (rule.enum !== undefined && !rule.enum.includes(sanitized)) {
        return Result.success(
          rule.default !== undefined ? rule.default : rule.enum[0]
        );
      }

      return Result.success(sanitized);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * 真偽値をサニタイズ
   * @param {any} value - サニタイズ対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @returns {Result<boolean>} サニタイズ結果
   * @private
   */
  _sanitizeBoolean(value, rule) {
    try {
      // nullまたはundefinedの場合はデフォルト値を使用
      if (value === null || value === undefined) {
        return Result.success(
          rule.default !== undefined ? rule.default : false
        );
      }

      // 文字列の場合は特別処理
      if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        if (
          lowerValue === "true" ||
          lowerValue === "yes" ||
          lowerValue === "1"
        ) {
          return Result.success(true);
        }
        if (
          lowerValue === "false" ||
          lowerValue === "no" ||
          lowerValue === "0"
        ) {
          return Result.success(false);
        }
      }

      // 数値の場合は0以外をtrueとする
      if (typeof value === "number") {
        return Result.success(value !== 0);
      }

      // その他の場合は真偽値に変換
      return Result.success(Boolean(value));
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * オブジェクトをサニタイズ
   * @param {any} value - サニタイズ対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @returns {Result<Object>} サニタイズ結果
   * @private
   */
  _sanitizeObject(value, rule) {
    try {
      // nullまたはundefinedの場合はデフォルト値を使用
      if (value === null || value === undefined) {
        return Result.success(
          rule.default !== undefined ? this._deepCopy(rule.default) : {}
        );
      }

      // オブジェクトでない場合はデフォルト値を使用
      if (typeof value !== "object" || Array.isArray(value)) {
        return Result.success(
          rule.default !== undefined ? this._deepCopy(rule.default) : {}
        );
      }

      // プロパティが定義されている場合は再帰的にサニタイズ
      if (rule.properties) {
        const sanitized = this.sanitize(value, rule.properties);
        if (sanitized.isFailure()) {
          return Result.success(
            rule.default !== undefined ? this._deepCopy(rule.default) : {}
          );
        }
        return sanitized;
      }

      return Result.success(value);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * 配列をサニタイズ
   * @param {any} value - サニタイズ対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @returns {Result<Array>} サニタイズ結果
   * @private
   */
  _sanitizeArray(value, rule) {
    try {
      // nullまたはundefinedの場合はデフォルト値を使用
      if (value === null || value === undefined) {
        return Result.success(
          rule.default !== undefined ? this._deepCopy(rule.default) : []
        );
      }

      // 配列でない場合は配列に変換
      if (!Array.isArray(value)) {
        // 文字列の場合はカンマで分割
        if (typeof value === "string") {
          value = value.split(",").map((item) => item.trim());
        } else {
          // その他の場合は単一要素の配列にする
          value = [value];
        }
      }

      // 長さ制限
      if (rule.maxItems !== undefined && value.length > rule.maxItems) {
        value = value.slice(0, rule.maxItems);
      }

      // 要素のサニタイズ
      if (rule.items) {
        const sanitizedArray = [];

        for (const item of value) {
          const sanitizer = this.sanitizers.get(rule.items.type);
          if (sanitizer) {
            const sanitized = sanitizer(item, rule.items);
            if (sanitized.success) {
              sanitizedArray.push(sanitized.data);
            } else if (rule.items.default !== undefined) {
              sanitizedArray.push(this._deepCopy(rule.items.default));
            }
          } else {
            sanitizedArray.push(item);
          }
        }

        return Result.success(sanitizedArray);
      }

      return Result.success(value);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * 日付をサニタイズ
   * @param {any} value - サニタイズ対象値
   * @param {ValidationRule} rule - バリデーションルール
   * @returns {Result<Date>} サニタイズ結果
   * @private
   */
  _sanitizeDate(value, rule) {
    try {
      // nullまたはundefinedの場合はデフォルト値を使用
      if (value === null || value === undefined) {
        return Result.success(
          rule.default !== undefined ? this._deepCopy(rule.default) : new Date()
        );
      }

      // 日付オブジェクトの場合はそのまま返す
      if (value instanceof Date && !isNaN(value.getTime())) {
        return Result.success(value);
      }

      // 数値の場合はタイムスタンプとして扱う
      if (typeof value === "number") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return Result.success(date);
        }
      }

      // 文字列の場合は日付として解析
      if (typeof value === "string") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return Result.success(date);
        }
      }

      // 変換できない場合はデフォルト値を使用
      return Result.success(
        rule.default !== undefined ? this._deepCopy(rule.default) : new Date()
      );
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * デフォルトオブジェクトを作成
   * @param {Object<string, ValidationRule>} schema - バリデーションスキーマ
   * @returns {Object} デフォルトオブジェクト
   * @private
   */
  _createDefaultObject(schema) {
    const defaultObj = {};

    for (const [key, rule] of Object.entries(schema)) {
      if (rule.default !== undefined) {
        defaultObj[key] = this._deepCopy(rule.default);
      } else {
        // 型に応じたデフォルト値を設定
        switch (rule.type) {
          case DataType.STRING:
            defaultObj[key] = "";
            break;

          case DataType.NUMBER:
            defaultObj[key] = 0;
            break;

          case DataType.BOOLEAN:
            defaultObj[key] = false;
            break;

          case DataType.OBJECT:
            defaultObj[key] = rule.properties
              ? this._createDefaultObject(rule.properties)
              : {};
            break;

          case DataType.ARRAY:
            defaultObj[key] = [];
            break;

          case DataType.DATE:
            defaultObj[key] = new Date();
            break;

          default:
            defaultObj[key] = null;
        }
      }
    }

    return defaultObj;
  }

  /**
   * オブジェクトのディープコピーを作成
   * @param {any} obj - コピー対象オブジェクト
   * @returns {any} コピーされたオブジェクト
   * @private
   */
  _deepCopy(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // 日付オブジェクトの場合
    if (obj instanceof Date) {
      return new Date(obj);
    }

    // 配列の場合
    if (Array.isArray(obj)) {
      return obj.map((item) => this._deepCopy(item));
    }

    // 通常のオブジェクトの場合
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = this._deepCopy(obj[key]);
      }
    }
    return copy;
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DataType,
    DataValidator,
  };
} else if (typeof window !== "undefined") {
  window.DataType = DataType;
  window.DataValidator = DataValidator;
}
