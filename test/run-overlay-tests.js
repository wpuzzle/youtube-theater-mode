#!/usr/bin/env node

/**
 * Simple test runner for Theater Mode Overlay functionality
 */

console.log("🧪 Running Theater Mode Overlay Tests...\n");

// Mock DOM environment
const mockDOM = {
  createElement: (tag) => {
    const element = {
      id: "",
      className: "",
      style: { cssText: "", backgroundColor: "" },
      innerHTML: "",
      parentNode: null,
      remove: function () {
        if (this.parentNode) this.parentNode.removeChild(this);
      },
    };

    element.classList = {
      contains: function (cls) {
        return (element.className || "").includes(cls);
      },
      add: function (cls) {
        if (!(element.className || "").includes(cls)) {
          element.className =
            (element.className ? element.className + " " : "") + cls;
        }
      },
      remove: function (cls) {
        element.className = (element.className || "")
          .replace(new RegExp("\\b" + cls + "\\b", "g"), "")
          .replace(/\s+/g, " ")
          .trim();
      },
    };

    return element;
  },
  body: {
    classList: {
      contains: (cls) => false,
      add: (cls) => console.log(`  → Body class added: ${cls}`),
      remove: (cls) => console.log(`  → Body class removed: ${cls}`),
    },
    appendChild: (el) => {
      el.parentNode = mockDOM.body;
    },
    removeChild: (el) => {
      el.parentNode = null;
    },
  },
  querySelector: (sel) => {
    if (sel === "#movie_player") {
      return {
        classList: {
          contains: (cls) => false,
          add: (cls) => console.log(`  → Video player class added: ${cls}`),
          remove: (cls) =>
            console.log(`  → Video player class removed: ${cls}`),
        },
      };
    }
    return null;
  },
};

// Test TheaterModeController class
class TestTheaterModeController {
  constructor() {
    this.isTheaterModeActive = false;
    this.overlayElement = null;
    this.currentOpacity = 0.7;
  }

  toggleTheaterMode() {
    if (this.isTheaterModeActive) {
      this.disableTheaterMode();
    } else {
      this.enableTheaterMode();
    }
  }

  enableTheaterMode() {
    if (this.isTheaterModeActive) return;

    this.applyOverlay();
    this.isTheaterModeActive = true;
    mockDOM.body.classList.add("theater-mode-active");
  }

  disableTheaterMode() {
    if (!this.isTheaterModeActive) return;

    this.removeOverlay();
    this.isTheaterModeActive = false;
    mockDOM.body.classList.remove("theater-mode-active");
  }

  updateOpacity(opacity) {
    this.currentOpacity = Math.max(0, Math.min(0.9, opacity));

    if (this.overlayElement) {
      this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
    }
  }

  applyOverlay() {
    this.removeOverlay();

    try {
      this.overlayElement = mockDOM.createElement("div");
      this.overlayElement.className =
        "theater-mode-overlay theater-mode-fade-in";
      this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;

      mockDOM.body.appendChild(this.overlayElement);

      const videoPlayer = mockDOM.querySelector("#movie_player");
      if (videoPlayer) {
        videoPlayer.classList.add("theater-mode-video-area");
      }
    } catch (error) {
      console.error("Error applying overlay:", error);
      this.removeOverlay();
    }
  }

  removeOverlay() {
    try {
      if (this.overlayElement) {
        this.overlayElement.classList.remove("theater-mode-fade-in");
        this.overlayElement.classList.add("theater-mode-fade-out");
        this.overlayElement = null;
      }

      const videoPlayer = mockDOM.querySelector("#movie_player");
      if (videoPlayer) {
        videoPlayer.classList.remove("theater-mode-video-area");
      }
    } catch (error) {
      console.error("Error removing overlay:", error);
      this.overlayElement = null;
    }
  }
}

// Test runner
function runTests() {
  const controller = new TestTheaterModeController();
  let passCount = 0;
  let totalCount = 0;

  function test(description, condition) {
    totalCount++;
    if (condition) {
      console.log(`✅ PASS: ${description}`);
      passCount++;
    } else {
      console.log(`❌ FAIL: ${description}`);
    }
  }

  // Test 1: Initial state
  console.log("Test 1: Initial State");
  test(
    "Theater mode should be inactive initially",
    !controller.isTheaterModeActive
  );
  test(
    "Overlay element should be null initially",
    controller.overlayElement === null
  );
  test("Default opacity should be 0.7", controller.currentOpacity === 0.7);

  // Test 2: Enable theater mode
  console.log("\nTest 2: Enable Theater Mode");
  controller.enableTheaterMode();
  test(
    "Theater mode should be active after enabling",
    controller.isTheaterModeActive
  );
  test(
    "Overlay element should exist after enabling",
    controller.overlayElement !== null
  );

  // Test 3: Overlay element validation
  console.log("\nTest 3: Overlay Element Validation");
  const overlay = controller.overlayElement;
  test(
    "Overlay should have theater-mode-overlay class",
    overlay && overlay.classList.contains("theater-mode-overlay")
  );
  test(
    "Overlay should have fade-in class",
    overlay && overlay.classList.contains("theater-mode-fade-in")
  );
  test(
    "Overlay should have correct background color",
    overlay && overlay.style.backgroundColor.includes("rgba(0, 0, 0, 0.7)")
  );

  // Test 4: Opacity update
  console.log("\nTest 4: Opacity Update");
  controller.updateOpacity(0.5);
  test("Opacity should be updated to 0.5", controller.currentOpacity === 0.5);
  test(
    "Overlay background should reflect new opacity",
    overlay && overlay.style.backgroundColor.includes("rgba(0, 0, 0, 0.5)")
  );

  // Test 5: Opacity range limits
  console.log("\nTest 5: Opacity Range Limits");
  controller.updateOpacity(1.5);
  test(
    "Opacity should be clamped to maximum 0.9",
    controller.currentOpacity === 0.9
  );

  controller.updateOpacity(-0.5);
  test(
    "Opacity should be clamped to minimum 0",
    controller.currentOpacity === 0
  );

  // Test 6: Disable theater mode
  console.log("\nTest 6: Disable Theater Mode");
  controller.disableTheaterMode();
  test(
    "Theater mode should be inactive after disabling",
    !controller.isTheaterModeActive
  );
  test(
    "Overlay element should be null after disabling",
    controller.overlayElement === null
  );

  // Test 7: Toggle functionality
  console.log("\nTest 7: Toggle Functionality");
  controller.toggleTheaterMode();
  test(
    "Toggle should enable theater mode when inactive",
    controller.isTheaterModeActive
  );

  controller.toggleTheaterMode();
  test(
    "Toggle should disable theater mode when active",
    !controller.isTheaterModeActive
  );

  // Test 8: Duplicate operations
  console.log("\nTest 8: Duplicate Operations");
  controller.enableTheaterMode();
  const firstOverlay = controller.overlayElement;
  controller.enableTheaterMode();
  test(
    "Duplicate enable should replace existing overlay",
    controller.overlayElement !== firstOverlay
  );

  controller.disableTheaterMode();
  const wasInactive = !controller.isTheaterModeActive;
  controller.disableTheaterMode();
  test(
    "Duplicate disable should not cause errors",
    wasInactive && !controller.isTheaterModeActive
  );

  // Results summary
  console.log("\n" + "=".repeat(50));
  console.log("🧪 Test Results Summary");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${totalCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${totalCount - passCount}`);
  console.log(`Success Rate: ${((passCount / totalCount) * 100).toFixed(1)}%`);

  return {
    total: totalCount,
    passed: passCount,
    failed: totalCount - passCount,
    successRate: (passCount / totalCount) * 100,
  };
}

// Run the tests
const results = runTests();

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
