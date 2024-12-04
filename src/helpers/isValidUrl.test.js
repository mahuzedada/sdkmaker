const isValidUrl = require("./isValidUrl");

describe("URL Validator", () => {
  // Helper function to test multiple URLs with the same configuration
  const testUrls = (urls, options = {}, expectedResult = true) => {
    urls.forEach((url) => {
      test(`"${url}" should ${expectedResult ? "be valid" : "be invalid"}`, () => {
        expect(isValidUrl(url, options)).toBe(expectedResult);
      });
    });
  };

  describe("Basic URL Validation", () => {
    const validUrls = [
      "https://example.com",
      "http://example.com",
      "https://sub.example.com",
      "https://example.com/path",
      "https://example.com/path?query=1",
      "https://example.com:8080",
      "https://example.com#fragment",
    ];

    const invalidUrls = [
      "",
      " ",
      "not-a-url",
      "http://",
      "https://",
      "example",
      "https://example",
      "https://.com",
      "https://example.",
      "http://example..com",
    ];

    testUrls(validUrls);
    testUrls(invalidUrls, {}, false);
  });

  describe("Protocol Handling", () => {
    describe("with requireProtocol = true (default)", () => {
      const urlsWithoutProtocol = [
        "example.com",
        "www.example.com",
        "sub.example.com/path",
      ];

      testUrls(urlsWithoutProtocol, {}, false);
    });

    describe("with requireProtocol = false", () => {
      const urlsWithoutProtocol = [
        "example.com",
        "www.example.com",
        "sub.example.com/path",
      ];

      testUrls(urlsWithoutProtocol, { requireProtocol: false });
    });

    describe("with custom protocols", () => {
      const customProtocolUrls = [
        "ftp://example.com",
        "ws://example.com",
        "wss://example.com",
      ];

      test("should allow custom protocols when specified", () => {
        const options = { allowedProtocols: ["ftp:", "ws:", "wss:"] };
        customProtocolUrls.forEach((url) => {
          expect(isValidUrl(url, options)).toBe(true);
        });
      });

      test("should reject custom protocols when not specified", () => {
        customProtocolUrls.forEach((url) => {
          expect(isValidUrl(url)).toBe(false);
        });
      });
    });
  });

  describe("IP Address Handling", () => {
    const ipv4Addresses = [
      "http://192.168.1.1",
      "https://10.0.0.1",
      "https://172.16.0.1",
    ];

    describe("with allowIp = true (default)", () => {
      testUrls(ipv4Addresses);
    });

    describe("with allowIp = false", () => {
      testUrls(ipv4Addresses, { allowIp: false }, false);
    });
  });

  describe("Localhost Handling", () => {
    const localhostUrls = [
      "http://localhost",
      "http://localhost:3000",
      "http://127.0.0.1",
    ];

    describe("with allowLocalhost = true (default)", () => {
      testUrls(localhostUrls);
    });

    describe("with allowLocalhost = false", () => {
      testUrls(localhostUrls, { allowLocalhost: false }, false);
    });
  });

  describe("Edge Cases and Special Characters", () => {
    const validSpecialUrls = [
      "https://example-site.com",
      "https://exam.ple.com",
      "https://example.com/path-with-dashes",
      "https://example.com/path_with_underscores",
      "https://example.com/path.with.dots",
      "https://example.com/path/with/slashes",
      "https://example.com:8080/path?query=value&other=value#fragment",
      "https://example.com/path?query=hello world",
      "https://example.com/path?query=special!@$*()",
      "https://xn--bcher-kva.example", // Punycode
      "https://exampl3-with-numb3rs.com",
    ];

    const invalidSpecialUrls = [
      "https://-example.com",
      "https://example-.com",
      "https://example..com",
      "https://*.example.com",
      "http://example.com:abc", // Invalid port
      "http://exa mple.com", // Space in domain
      "https://example.com:65536", // Port number too high
    ];

    testUrls(validSpecialUrls);
    testUrls(invalidSpecialUrls, {}, false);
  });

  describe("Input Type Validation", () => {
    test("should handle non-string inputs", () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        {},
        [],
        true,
        false,
        () => {},
      ];

      invalidInputs.forEach((input) => {
        expect(isValidUrl(input)).toBe(false);
      });
    });

    test("should handle empty strings and whitespace", () => {
      const emptyInputs = ["", " ", "\n", "\t", "  ", "\n\n", "\t\t"];

      emptyInputs.forEach((input) => {
        expect(isValidUrl(input)).toBe(false);
      });
    });
  });

  describe("Performance Tests", () => {
    test("should handle long URLs efficiently", () => {
      const longPath = "a".repeat(2000);
      const longUrl = `https://example.com/${longPath}`;
      expect(isValidUrl(longUrl)).toBe(true);
    });

    test("should handle many segments efficiently", () => {
      const manySegments = Array(100).fill("segment").join("/");
      const longUrl = `https://example.com/${manySegments}`;
      expect(isValidUrl(longUrl)).toBe(true);
    });
  });

  describe("Security Edge Cases", () => {
    const maliciousUrls = [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "\x00javascript:alert(1)",
      "\\\\server\\share",
    ];

    testUrls(maliciousUrls, {}, false);
  });
});
