import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia. Report "prefers reduced motion" so count-up and other
// motion effects settle to their final value synchronously in tests.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as typeof window.matchMedia;
}
