jest.mock("./getRequestBodyType");
jest.mock("./getResponseType");

const generateApiMethods = require("./generateApiMethods");
const getRequestBodyType = require("./getRequestBodyType");
const getResponseType = require("./getResponseType");

describe("generateApiMethods", () => {
  beforeEach(() => {
    getRequestBodyType.mockReset();
    getResponseType.mockReset();
  });

  test("generates GET method with array response", () => {
    getResponseType.mockReturnValue("User[]");

    const methods = [
      {
        operationId: "getUsers",
        summary: "Get all users",
        method: "get",
        path: "/users",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
    ];

    const expected = `
/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  const axiosInstance = axiosClient.getInstance();
  const response = await axiosInstance({
    url: \`/users\`,
    method: 'GET',
  });
  return response.data;
}`;

    expect(generateApiMethods(methods)).toBe(expected);
    expect(getResponseType).toHaveBeenCalledWith(methods[0].responses);
  });

  test("generates POST with request body", () => {
    getRequestBodyType.mockReturnValue("CreateUserDto");
    getResponseType.mockReturnValue("User");

    const methods = [
      {
        operationId: "createUser",
        summary: "Create user",
        method: "post",
        path: "/users",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserDto" },
            },
          },
        },
        responses: {
          201: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
    ];

    const expected = `
/**
 * Create user
 * @param {CreateUserDto} data
 */
export async function createUser(data: CreateUserDto): Promise<User> {
  const axiosInstance = axiosClient.getInstance();
  const response = await axiosInstance({
    url: \`/users\`,
    method: 'POST',
    data,
  });
  return response.data;
}`;

    expect(generateApiMethods(methods)).toBe(expected);
    expect(getRequestBodyType).toHaveBeenCalledWith(methods[0].requestBody);
    expect(getResponseType).toHaveBeenCalledWith(methods[0].responses);
  });
});
