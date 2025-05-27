import { jest, describe, expect, beforeEach, test } from "@jest/globals";
import { advanceBy, clear } from "jest-date-mock";
import ConnectionManager from "../../src/lib/connection_manager.js";

const MAX_CONNECTIONS = 100;

describe("ConnectionManager#maybeAddConnection", () => {
  let connectionManager;
  const mockDeleteCallback = jest.fn();

  beforeEach(() => {
    connectionManager = new ConnectionManager(
      MAX_CONNECTIONS,
      mockDeleteCallback,
    );
    mockDeleteCallback.mockClear();
  });

  test("Can add/remove single connection", () => {
    const mockSocket = {};
    expect(connectionManager.maybeAddConnection(mockSocket)).toBe(true);
    expect(connectionManager.connections.has(mockSocket)).toBe(true);
    connectionManager.removeConnection(mockSocket);
    expect(connectionManager.connections.has(mockSocket)).toBe(false);
  });

  test("Connections limited to 100", () => {
    // Add maximum number of connections, and each should be successful.
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
      const newMockSocket = {};
      expect(connectionManager.maybeAddConnection(newMockSocket)).toBe(true);
      expect(connectionManager.connections.has(newMockSocket)).toBe(true);
    }
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);

    // One too many connections should return false and connections should not increase.
    const beyondMaxSocket = {};
    expect(connectionManager.maybeAddConnection(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.has(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);
  });

  test("Connections limited to 100", () => {
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
      const newMockSocket = {};
      expect(connectionManager.maybeAddConnection(newMockSocket)).toBe(true);
      expect(connectionManager.connections.has(newMockSocket)).toBe(true);
    }
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);
    // One too many connections should return false and connections should not increase.
    const beyondMaxSocket = {};
    expect(connectionManager.maybeAddConnection(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.has(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);
  });

  test("Old connection can be bumped.", () => {
    const oldestMockSocket = {};
    expect(connectionManager.maybeAddConnection(oldestMockSocket)).toBe(true);
    expect(connectionManager.connections.has(oldestMockSocket)).toBe(true);
    // Fill connection list with 99 more.
    for (let i = 0; i < MAX_CONNECTIONS - 1; i++) {
      const newMockSocket = {};
      expect(connectionManager.maybeAddConnection(newMockSocket)).toBe(true);
      expect(connectionManager.connections.has(newMockSocket)).toBe(true);
    }
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);

    advanceBy(11000); // Advance date mock by 11 seconds.

    const beyondMaxSocket = {};
    // Add one connection beyond max:
    expect(connectionManager.maybeAddConnection(beyondMaxSocket)).toBe(true);
    // Expect it succeed since oldest can be bumped after at least 10 seconds.
    expect(connectionManager.connections.has(beyondMaxSocket)).toBe(true);
    // Expect oldest to have been removed and also passed into delete callback.
    expect(connectionManager.connections.has(oldestMockSocket)).toBe(false);
    expect(mockDeleteCallback).toHaveBeenCalledWith(oldestMockSocket);

    clear(); // Clear out date mock (Date.now() will return current time again).
  });
});
