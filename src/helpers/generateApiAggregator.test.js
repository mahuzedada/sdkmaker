const generateApiAggregator = require("./generateApiAggregator");

describe("generateApiAggregator", () => {
  it("should generate empty exports when no controllers are provided", () => {
    const result = generateApiAggregator({});
    expect(result.trim()).toEqual(``);
  });

  it("should generate empty exports when controllers object is null", () => {
    expect(() => generateApiAggregator(null)).toThrow(
      "[ValidationError] in Controllers must be a non-null object: undefined",
    );
  });

  it("should skip controllers with empty arrays", () => {
    const controllers = {
      users: [],
      posts: [],
    };
    const result = generateApiAggregator(controllers);
    expect(result.trim()).toEqual(``);
  });

  it("should generate imports and exports for single controller with methods", () => {
    const controllers = {
      users: ["getUsers", "createUser"],
    };

    const expected = `
import * as users from './users';

export default {
  ...users
};`;

    const result = generateApiAggregator(controllers);
    expect(result.trim()).toEqual(expected.trim());
  });

  it("should generate imports and exports for multiple controllers with methods", () => {
    const controllers = {
      users: ["getUsers", "createUser"],
      posts: ["getPosts", "createPost"],
      comments: ["getComments"],
    };

    const expected = `
import * as users from './users';
import * as posts from './posts';
import * as comments from './comments';

export default {
  ...users,
  ...posts,
  ...comments
};`;

    const result = generateApiAggregator(controllers);
    expect(result.trim()).toEqual(expected.trim());
  });

  it("should skip controllers with empty arrays while including valid ones", () => {
    const controllers = {
      users: ["getUsers", "createUser"],
      posts: [],
      comments: ["getComments"],
    };

    const expected = `
import * as users from './users';
import * as comments from './comments';

export default {
  ...users,
  ...comments
};`;

    const result = generateApiAggregator(controllers);
    expect(result.trim()).toEqual(expected.trim());
  });

  it("should handle controllers with special characters in names", () => {
    const controllers = {
      "user-controller": ["getUsers"],
      post_controller: ["getPosts"],
    };

    const expected = `
import * as user-controller from './user-controller';
import * as post_controller from './post_controller';

export default {
  ...user-controller,
  ...post_controller
};`;

    const result = generateApiAggregator(controllers);
    expect(result.trim()).toEqual(expected.trim());
  });

  it("should preserve consistent spacing and newlines", () => {
    const controllers = {
      users: ["getUsers"],
    };

    const result = generateApiAggregator(controllers);
    const lines = result.split("\n");

    // Check consistent spacing in export block
    expect(lines[1]).toEqual("");
    expect(lines[2]).toEqual("export default {");
    expect(lines[3]).toEqual("  ...users");
    expect(lines[4]).toEqual("};");
  });

  it("should handle mixed valid and empty controllers", () => {
    const controllers = {
      users: ["getUsers"],
      posts: [],
      comments: ["getComments"],
      categories: [],
      tags: ["getTags"],
    };

    const expected = `
import * as users from './users';
import * as comments from './comments';
import * as tags from './tags';

export default {
  ...users,
  ...comments,
  ...tags
};`;

    const result = generateApiAggregator(controllers);
    expect(result.trim()).toEqual(expected.trim());
  });
});
