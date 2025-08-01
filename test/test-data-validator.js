/**
 * DataValidator のテスト
 */

// 依存関係のインポート
const {
  DataType,
  DataValidator,
} = require("../infrastructure/data-validator.js");
const { Logger } = require("../infrastructure/logger.js");
const { ErrorHandler } = require("../infrastructure/error-handler.js");

// テスト用のロガーとエラーハンドラーを作成
const logger = new Logger("DataValidatorTest", {
  level: Logger.LogLevel.DEBUG,
});
const errorHandler = new ErrorHandler(logger);

/**
 * テスト実行関数
 */
async function runTests() {
  console.log("=== DataValidator Tests ===");

  // 各テストを実行
  testInitialization();
  testSchemaManagement();
  testBasicValidation();
  testNestedValidation();
  testArrayValidation();
  testSanitization();
  testCustomValidation();
  testComplexSchema();

  console.log("=== All DataValidator Tests Completed ===");
}

/**
 * 初期化テスト
 */
function testInitialization() {
  console.log("Testing initialization...");

  // デフォルト初期化
  const validator1 = new DataValidator();
  console.assert(
    validator1 instanceof DataValidator,
    "Should create a DataValidator instance"
  );

  // ロガーとエラーハンドラーを指定して初期化
  const validator2 = new DataValidator({
    logger,
    errorHandler,
  });
  console.assert(validator2.logger === logger, "Should set logger");
  console.assert(
    validator2.errorHandler === errorHandler,
    "Should set errorHandler"
  );

  console.log("✓ Initialization tests passed");
}

/**
 * スキーマ管理テスト
 */
function testSchemaManagement() {
  console.log("Testing schema management...");

  const validator = new DataValidator({ logger, errorHandler });

  // スキーマを登録
  const userSchema = {
    name: {
      type: DataType.STRING,
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    age: {
      type: DataType.NUMBER,
      min: 0,
      max: 120,
      default: 18,
    },
    email: {
      type: DataType.STRING,
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
  };

  validator.registerSchema("user", userSchema);

  // スキーマを取得
  const retrievedSchema = validator.getSchema("user");
  console.assert(retrievedSchema !== null, "Should retrieve registered schema");
  console.assert(
    retrievedSchema.name.type === DataType.STRING,
    "Retrieved schema should match registered schema"
  );

  // スキーマ名の一覧を取得
  const schemaNames = validator.getSchemaNames();
  console.assert(
    schemaNames.includes("user"),
    "Schema names should include 'user'"
  );

  // スキーマを削除
  const removed = validator.removeSchema("user");
  console.assert(removed === true, "Should remove schema");

  // 削除後のスキーマ取得
  const deletedSchema = validator.getSchema("user");
  console.assert(
    deletedSchema === null,
    "Should return null for removed schema"
  );

  console.log("✓ Schema management tests passed");
}

/**
 * 基本的なバリデーションテスト
 */
function testBasicValidation() {
  console.log("Testing basic validation...");

  const validator = new DataValidator({ logger, errorHandler });

  // 基本的なスキーマ
  const schema = {
    name: {
      type: DataType.STRING,
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    age: {
      type: DataType.NUMBER,
      min: 0,
      max: 120,
      default: 18,
    },
    isActive: {
      type: DataType.BOOLEAN,
      default: false,
    },
    role: {
      type: DataType.STRING,
      enum: ["user", "admin", "guest"],
      default: "user",
    },
  };

  // 有効なデータ
  const validData = {
    name: "John Doe",
    age: 30,
    isActive: true,
    role: "admin",
  };

  const validResult = validator.validate(validData, schema);
  console.assert(
    validResult.success,
    "Validation should succeed for valid data"
  );
  console.assert(
    validResult.data.valid,
    "Valid data should be marked as valid"
  );
  console.assert(
    validResult.data.errors.length === 0,
    "Valid data should have no errors"
  );

  // 無効なデータ
  const invalidData = {
    name: "J", // Too short
    age: 150, // Too high
    isActive: "not a boolean", // Wrong type
    role: "superadmin", // Not in enum
  };

  const invalidResult = validator.validate(invalidData, schema);
  console.assert(
    invalidResult.success,
    "Validation operation should succeed even for invalid data"
  );
  console.assert(
    invalidResult.data.valid === false,
    "Invalid data should be marked as invalid"
  );
  console.assert(
    invalidResult.data.errors.length > 0,
    "Invalid data should have errors"
  );

  // 必須フィールドの欠落
  const missingRequired = {
    age: 25,
    isActive: true,
  };

  const missingResult = validator.validate(missingRequired, schema);
  console.assert(missingResult.success, "Validation operation should succeed");
  console.assert(
    missingResult.data.valid === false,
    "Data with missing required field should be invalid"
  );
  console.assert(
    missingResult.data.errors.some((e) => e.code === "required"),
    "Should have 'required' error"
  );

  // 型違反
  const wrongTypes = {
    name: 123, // Not a string
    age: "thirty", // Not a number
    isActive: 1, // Not a boolean (but will be converted)
    role: true, // Not a string
  };

  const typesResult = validator.validate(wrongTypes, schema);
  console.assert(typesResult.success, "Validation operation should succeed");
  console.assert(
    typesResult.data.valid === false,
    "Data with wrong types should be invalid"
  );
  console.assert(
    typesResult.data.errors.some((e) => e.code === "type"),
    "Should have 'type' error"
  );

  console.log("✓ Basic validation tests passed");
}

/**
 * ネストされたバリデーションテスト
 */
function testNestedValidation() {
  console.log("Testing nested validation...");

  const validator = new DataValidator({ logger, errorHandler });

  // ネストされたスキーマ
  const schema = {
    user: {
      type: DataType.OBJECT,
      required: true,
      properties: {
        name: {
          type: DataType.STRING,
          required: true,
          minLength: 2,
        },
        contact: {
          type: DataType.OBJECT,
          properties: {
            email: {
              type: DataType.STRING,
              pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            },
            phone: {
              type: DataType.STRING,
              pattern: /^\d{10,15}$/,
            },
          },
        },
      },
    },
    settings: {
      type: DataType.OBJECT,
      properties: {
        theme: {
          type: DataType.STRING,
          enum: ["light", "dark", "auto"],
          default: "auto",
        },
        notifications: {
          type: DataType.BOOLEAN,
          default: true,
        },
      },
    },
  };

  // 有効なデータ
  const validData = {
    user: {
      name: "John Doe",
      contact: {
        email: "john@example.com",
        phone: "1234567890",
      },
    },
    settings: {
      theme: "dark",
      notifications: false,
    },
  };

  const validResult = validator.validate(validData, schema);
  console.assert(
    validResult.success,
    "Validation should succeed for valid nested data"
  );
  console.assert(
    validResult.data.valid,
    "Valid nested data should be marked as valid"
  );

  // 無効なネストデータ
  const invalidData = {
    user: {
      name: "J", // Too short
      contact: {
        email: "not-an-email", // Invalid email
        phone: "123", // Too short
      },
    },
    settings: {
      theme: "blue", // Not in enum
      notifications: "yes", // Wrong type
    },
  };

  const invalidResult = validator.validate(invalidData, schema);
  console.assert(invalidResult.success, "Validation operation should succeed");
  console.assert(
    invalidResult.data.valid === false,
    "Invalid nested data should be marked as invalid"
  );
  console.assert(
    invalidResult.data.errors.length > 0,
    "Invalid nested data should have errors"
  );
  console.assert(
    invalidResult.data.errors.some((e) => e.path === "user.name"),
    "Should have error for user.name"
  );
  console.assert(
    invalidResult.data.errors.some((e) => e.path === "user.contact.email"),
    "Should have error for user.contact.email"
  );

  console.log("✓ Nested validation tests passed");
}

/**
 * 配列バリデーションテスト
 */
function testArrayValidation() {
  console.log("Testing array validation...");

  const validator = new DataValidator({ logger, errorHandler });

  // 配列を含むスキーマ
  const schema = {
    tags: {
      type: DataType.ARRAY,
      items: {
        type: DataType.STRING,
        minLength: 2,
        maxLength: 20,
      },
      minItems: 1,
      maxItems: 5,
    },
    scores: {
      type: DataType.ARRAY,
      items: {
        type: DataType.NUMBER,
        min: 0,
        max: 100,
      },
    },
    users: {
      type: DataType.ARRAY,
      items: {
        type: DataType.OBJECT,
        properties: {
          id: {
            type: DataType.NUMBER,
            required: true,
          },
          name: {
            type: DataType.STRING,
            required: true,
          },
        },
      },
    },
  };

  // 有効なデータ
  const validData = {
    tags: ["javascript", "typescript", "node"],
    scores: [85, 90, 75, 100],
    users: [
      { id: 1, name: "User 1" },
      { id: 2, name: "User 2" },
    ],
  };

  const validResult = validator.validate(validData, schema);
  console.assert(
    validResult.success,
    "Validation should succeed for valid array data"
  );
  console.assert(
    validResult.data.valid,
    "Valid array data should be marked as valid"
  );

  // 無効な配列データ
  const invalidData = {
    tags: ["a", "verylongtagthatexceedstwentycharacters", ""], // Invalid items
    scores: [50, 120, -10], // Out of range
    users: [
      { id: "1", name: "User 1" }, // id is string, not number
      { name: "User 2" }, // Missing required id
    ],
  };

  const invalidResult = validator.validate(invalidData, schema);
  console.assert(invalidResult.success, "Validation operation should succeed");
  console.assert(
    invalidResult.data.valid === false,
    "Invalid array data should be marked as invalid"
  );
  console.assert(
    invalidResult.data.errors.some((e) => e.path.startsWith("tags[")),
    "Should have error for tags items"
  );
  console.assert(
    invalidResult.data.errors.some((e) => e.path.startsWith("scores[")),
    "Should have error for scores items"
  );
  console.assert(
    invalidResult.data.errors.some((e) => e.path.startsWith("users[")),
    "Should have error for users items"
  );

  // 空の配列
  const emptyArrayData = {
    tags: [], // Violates minItems
    scores: [],
    users: [],
  };

  const emptyResult = validator.validate(emptyArrayData, schema);
  console.assert(emptyResult.success, "Validation operation should succeed");
  console.assert(
    emptyResult.data.valid === false,
    "Empty array data should be marked as invalid"
  );
  console.assert(
    emptyResult.data.errors.some((e) => e.code === "minItems"),
    "Should have minItems error"
  );

  console.log("✓ Array validation tests passed");
}

/**
 * サニタイゼーションテスト
 */
function testSanitization() {
  console.log("Testing sanitization...");

  const validator = new DataValidator({ logger, errorHandler });

  // サニタイゼーション用スキーマ
  const schema = {
    name: {
      type: DataType.STRING,
      minLength: 2,
      maxLength: 10,
      default: "Unknown",
    },
    age: {
      type: DataType.NUMBER,
      min: 0,
      max: 120,
      default: 18,
    },
    isActive: {
      type: DataType.BOOLEAN,
      default: false,
    },
    role: {
      type: DataType.STRING,
      enum: ["user", "admin", "guest"],
      default: "user",
    },
    tags: {
      type: DataType.ARRAY,
      items: {
        type: DataType.STRING,
        minLength: 2,
      },
      maxItems: 3,
      default: [],
    },
  };

  // 型変換が必要なデータ
  const dataToSanitize = {
    name: 123, // Should be converted to string
    age: "30", // Should be converted to number
    isActive: "yes", // Should be converted to boolean
    role: "superadmin", // Should be replaced with default
    tags: ["a", "valid", "tags", "too", "many"], // Should be truncated
  };

  // サニタイズ
  const sanitizeResult = validator.sanitize(dataToSanitize, schema);
  console.assert(sanitizeResult.success, "Sanitization should succeed");

  const sanitized = sanitizeResult.data;
  console.assert(
    typeof sanitized.name === "string",
    "name should be sanitized to string"
  );
  console.assert(sanitized.name === "123", "name should be '123'");
  console.assert(
    typeof sanitized.age === "number",
    "age should be sanitized to number"
  );
  console.assert(sanitized.age === 30, "age should be 30");
  console.assert(
    typeof sanitized.isActive === "boolean",
    "isActive should be sanitized to boolean"
  );
  console.assert(sanitized.isActive === true, "isActive should be true");
  console.assert(
    sanitized.role === "user",
    "role should be sanitized to default 'user'"
  );
  console.assert(Array.isArray(sanitized.tags), "tags should be an array");
  console.assert(
    sanitized.tags.length === 3,
    "tags should be truncated to 3 items"
  );

  // 範囲外の値
  const outOfRangeData = {
    age: 150, // Above max
    name: "ThisNameIsTooLong", // Too long
  };

  const rangeResult = validator.sanitize(outOfRangeData, schema);
  console.assert(rangeResult.success, "Sanitization should succeed");

  const rangeFixed = rangeResult.data;
  console.assert(rangeFixed.age === 120, "age should be clamped to max 120");
  console.assert(
    rangeFixed.name.length === 10,
    "name should be truncated to 10 characters"
  );

  // 欠落したプロパティ
  const missingData = {};

  const missingResult = validator.sanitize(missingData, schema);
  console.assert(missingResult.success, "Sanitization should succeed");

  const withDefaults = missingResult.data;
  console.assert(
    withDefaults.name === "Unknown",
    "name should be set to default"
  );
  console.assert(withDefaults.age === 18, "age should be set to default");
  console.assert(
    withDefaults.isActive === false,
    "isActive should be set to default"
  );
  console.assert(withDefaults.role === "user", "role should be set to default");
  console.assert(Array.isArray(withDefaults.tags), "tags should be an array");
  console.assert(withDefaults.tags.length === 0, "tags should be empty array");

  console.log("✓ Sanitization tests passed");
}

/**
 * カスタムバリデーションテスト
 */
function testCustomValidation() {
  console.log("Testing custom validation...");

  const validator = new DataValidator({ logger, errorHandler });

  // カスタムバリデーション関数を含むスキーマ
  const schema = {
    password: {
      type: DataType.STRING,
      required: true,
      minLength: 8,
      custom: (value) => {
        // パスワードの強度チェック
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

        const isStrong =
          hasUppercase && hasLowercase && hasNumber && hasSpecial;

        return (
          isStrong || {
            valid: false,
            message:
              "Password must contain uppercase, lowercase, number, and special character",
          }
        );
      },
    },
    username: {
      type: DataType.STRING,
      required: true,
      minLength: 3,
      custom: (value) => {
        // 英数字とアンダースコアのみ許可
        return (
          /^[a-zA-Z0-9_]+$/.test(value) ||
          "Username can only contain letters, numbers, and underscores"
        );
      },
    },
  };

  // 有効なデータ
  const validData = {
    password: "P@ssw0rd123",
    username: "john_doe123",
  };

  const validResult = validator.validate(validData, schema);
  console.assert(
    validResult.success,
    "Validation should succeed for valid data"
  );
  console.assert(
    validResult.data.valid,
    "Valid data should pass custom validation"
  );

  // 無効なデータ
  const invalidData = {
    password: "password", // No uppercase, number, or special char
    username: "john.doe@123", // Contains invalid characters
  };

  const invalidResult = validator.validate(invalidData, schema);
  console.assert(invalidResult.success, "Validation operation should succeed");
  console.assert(
    invalidResult.data.valid === false,
    "Invalid data should fail custom validation"
  );
  console.assert(
    invalidResult.data.errors.some((e) => e.code === "custom"),
    "Should have custom validation error"
  );

  console.log("✓ Custom validation tests passed");
}

/**
 * 複雑なスキーマテスト
 */
function testComplexSchema() {
  console.log("Testing complex schema...");

  const validator = new DataValidator({ logger, errorHandler });

  // 複雑なスキーマ
  const productSchema = {
    id: {
      type: DataType.STRING,
      required: true,
      pattern: /^PRD-\d{6}$/,
    },
    name: {
      type: DataType.STRING,
      required: true,
      minLength: 3,
      maxLength: 100,
    },
    price: {
      type: DataType.NUMBER,
      required: true,
      min: 0,
    },
    category: {
      type: DataType.OBJECT,
      required: true,
      properties: {
        id: {
          type: DataType.NUMBER,
          required: true,
        },
        name: {
          type: DataType.STRING,
          required: true,
        },
      },
    },
    tags: {
      type: DataType.ARRAY,
      items: {
        type: DataType.STRING,
      },
      default: [],
    },
    variants: {
      type: DataType.ARRAY,
      items: {
        type: DataType.OBJECT,
        properties: {
          id: {
            type: DataType.STRING,
            required: true,
          },
          color: {
            type: DataType.STRING,
          },
          size: {
            type: DataType.STRING,
            enum: ["S", "M", "L", "XL"],
          },
          price: {
            type: DataType.NUMBER,
            min: 0,
          },
          inStock: {
            type: DataType.BOOLEAN,
            default: true,
          },
        },
      },
    },
    metadata: {
      type: DataType.OBJECT,
      properties: {
        createdAt: {
          type: DataType.DATE,
          default: () => new Date(),
        },
        updatedAt: {
          type: DataType.DATE,
          default: () => new Date(),
        },
      },
    },
  };

  // スキーマを登録
  validator.registerSchema("product", productSchema);

  // 有効なデータ
  const validProduct = {
    id: "PRD-123456",
    name: "Smartphone X",
    price: 999.99,
    category: {
      id: 5,
      name: "Electronics",
    },
    tags: ["smartphone", "tech", "new"],
    variants: [
      {
        id: "VAR-1",
        color: "Black",
        size: "M",
        price: 999.99,
        inStock: true,
      },
      {
        id: "VAR-2",
        color: "White",
        size: "L",
        price: 1099.99,
        inStock: false,
      },
    ],
    metadata: {
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date(),
    },
  };

  // 名前でスキーマを参照して検証
  const validResult = validator.validate(validProduct, "product");
  console.assert(
    validResult.success,
    "Validation should succeed for valid product"
  );
  console.assert(
    validResult.data.valid,
    "Valid product should be marked as valid"
  );

  // 無効なデータ
  const invalidProduct = {
    id: "PROD123", // Invalid format
    name: "X", // Too short
    price: -10, // Negative price
    category: {
      name: "Electronics", // Missing required id
    },
    variants: [
      {
        color: "Black", // Missing required id
        size: "XXL", // Not in enum
      },
    ],
  };

  const invalidResult = validator.validate(invalidProduct, "product");
  console.assert(invalidResult.success, "Validation operation should succeed");
  console.assert(
    invalidResult.data.valid === false,
    "Invalid product should be marked as invalid"
  );
  console.assert(
    invalidResult.data.errors.length > 0,
    "Invalid product should have errors"
  );

  // サニタイズ
  const productToSanitize = {
    id: "PRD-123456",
    name: "Smartphone X",
    price: "1299.99", // String instead of number
    category: {
      id: "5", // String instead of number
      name: "Electronics",
    },
    tags: "smartphone,tech,new", // String instead of array
    variants: [
      {
        id: "VAR-1",
        color: "Black",
        size: "XXL", // Invalid enum
        price: -10, // Negative price
      },
    ],
  };

  const sanitizeResult = validator.sanitize(productToSanitize, "product");
  console.assert(sanitizeResult.success, "Sanitization should succeed");

  const sanitized = sanitizeResult.data;
  console.assert(
    typeof sanitized.price === "number",
    "price should be sanitized to number"
  );
  console.assert(
    typeof sanitized.category.id === "number",
    "category.id should be sanitized to number"
  );
  console.assert(
    Array.isArray(sanitized.tags),
    "tags should be sanitized to array"
  );
  console.assert(
    sanitized.variants[0].size === "S",
    "Invalid enum should be sanitized to default"
  );
  console.assert(
    sanitized.variants[0].price === 0,
    "Negative price should be sanitized to min value"
  );

  console.log("✓ Complex schema tests passed");
}

// Node.js環境でテストを実行
if (typeof require !== "undefined" && require.main === module) {
  runTests().catch(console.error);
}

// ブラウザ環境でのエクスポート
if (typeof window !== "undefined") {
  window.runDataValidatorTests = runTests;
}
