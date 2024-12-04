const yaml = require("js-yaml");
const ValidationError = require("../utils/custom-errors/ValidationError");
const parseYaml = require("./parseYaml");

describe("parseYaml", () => {
  describe("Valid YAML", () => {
    test("should parse valid object YAML", () => {
      const content = `
        name: John
        age: 30
        city: New York
      `;
      const result = parseYaml(content);
      expect(result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
    });

    test("should parse valid array YAML", () => {
      const content = `
        - apple
        - banana
        - orange
      `;
      const result = parseYaml(content);
      expect(result).toEqual(["apple", "banana", "orange"]);
    });

    test("should parse nested YAML", () => {
      const content = `
        person:
          name: John
          address:
            street: 123 Main St
            city: New York
        hobbies:
          - reading
          - gaming
      `;
      const result = parseYaml(content);
      expect(result).toEqual({
        person: {
          name: "John",
          address: {
            street: "123 Main St",
            city: "New York",
          },
        },
        hobbies: ["reading", "gaming"],
      });
    });

    test("should parse YAML with different data types", () => {
      const content = `
        string: Hello
        number: 42
        boolean: true
        null: null
        date: 2024-01-01
      `;
      const result = parseYaml(content);
      expect(result).toEqual({
        string: "Hello",
        number: 42,
        boolean: true,
        null: null,
        date: new Date("2024-01-01"),
      });
    });
  });

  describe("Invalid YAML", () => {
    test("should throw error for empty string", () => {
      expect(() => parseYaml("")).toThrow(
        "YAML content must be a non-empty string",
      );
    });

    test("should throw error for null input", () => {
      expect(() => parseYaml(null)).toThrow(
        "YAML content must be a non-empty string",
      );
    });

    test("should throw error for undefined input", () => {
      expect(() => parseYaml(undefined)).toThrow(
        "YAML content must be a non-empty string",
      );
    });

    test("should throw error for non-string input", () => {
      expect(() => parseYaml(123)).toThrow(
        "YAML content must be a non-empty string",
      );
      expect(() => parseYaml({})).toThrow(
        "YAML content must be a non-empty string",
      );
      expect(() => parseYaml([])).toThrow(
        "YAML content must be a non-empty string",
      );
    });

    test("should throw ValidationError for invalid YAML syntax", () => {
      const content = `
        name: John
        age: 30
        - invalid
        array: here
      `;
      expect(() => parseYaml(content)).toThrow(yaml.YAMLException);
    });

    test("should throw ValidationError for YAML that resolves to primitive", () => {
      const content = "just a string";
      expect(() => parseYaml(content)).toThrow(ValidationError);
      expect(() => parseYaml(content)).toThrow(
        "YAML content must resolve to an object or array",
      );
    });

    test("should throw ValidationError for empty YAML document", () => {
      const content = "---\n";
      expect(() => parseYaml(content)).toThrow(ValidationError);
      expect(() => parseYaml(content)).toThrow(
        "YAML content is empty or invalid",
      );
    });
  });

  describe("Edge Cases", () => {
    test("should parse YAML with comments", () => {
      const content = `
        # This is a comment
        name: John # Inline comment
        age: 30
      `;
      const result = parseYaml(content);
      expect(result).toEqual({
        name: "John",
        age: 30,
      });
    });

    test("should parse YAML with special characters", () => {
      const content = `
        special: "!@#$%^&*()"
        multiline: |
          This is a
          multiline string
        quoted: "This is: a quoted string"
      `;
      const result = parseYaml(content);
      expect(result).toEqual({
        special: "!@#$%^&*()",
        multiline: "This is a\nmultiline string\n",
        quoted: "This is: a quoted string",
      });
    });

    test("should parse YAML with empty objects and arrays", () => {
      const content = `
        emptyObject: {}
        emptyArray: []
        nestedEmpty:
          empty: {}
          array: []
      `;
      const result = parseYaml(content);
      expect(result).toEqual({
        emptyObject: {},
        emptyArray: [],
        nestedEmpty: {
          empty: {},
          array: [],
        },
      });
    });
  });

  describe("Performance and Size Limits", () => {
    test("should handle large YAML documents", () => {
      const items = Array.from(
        { length: 1000 },
        (_, i) => `item${i}: value${i}`,
      );
      const content = items.join("\n");
      const result = parseYaml(content);
      expect(Object.keys(result)).toHaveLength(1000);
    });

    test("should handle deeply nested YAML", () => {
      let content = "root:";
      let current = "root";
      for (let i = 0; i < 10; i++) {
        content += `\n  ${current}:\n    value: ${i}`;
        current += ".nested";
      }
      expect(() => parseYaml(content)).not.toThrow();
    });
  });
});
