import { describe, expect, beforeEach, test, vi } from "vitest";
import { Socket } from "node:net";
import ConnectionManager from "../../src/lib/connection_manager.js";

const MAX_CONNECTIONS = 100;

describe("ConnectionManager#maybeAddConnection", () => {
  let connectionManager : ConnectionManager;
  const mockDeleteCallback = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers()
    connectionManager = new ConnectionManager(
      MAX_CONNECTIONS,
      mockDeleteCallback,
    );
    mockDeleteCallback.mockClear();
  });

  test("Can add/remove single connection", () => {
    const mockSocket = {} as Socket;
    expect(connectionManager.maybeAddConnection(mockSocket)).toBe(true);
    expect(connectionManager.connections.has(mockSocket)).toBe(true);
    connectionManager.removeConnection(mockSocket);
    expect(connectionManager.connections.has(mockSocket)).toBe(false);
  });

  test("Connections limited to 100", () => {
    // Add maximum number of connections, and each should be successful.
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
      const newMockSocket = {} as Socket;
      expect(connectionManager.maybeAddConnection(newMockSocket)).toBe(true);
      expect(connectionManager.connections.has(newMockSocket)).toBe(true);
    }
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);

    // One too many connections should return false and connections should not increase.
    const beyondMaxSocket = {} as Socket;
    expect(connectionManager.maybeAddConnection(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.has(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);
  });

  test("Connections limited to 100", () => {
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
      const newMockSocket = {} as Socket;
      expect(connectionManager.maybeAddConnection(newMockSocket)).toBe(true);
      expect(connectionManager.connections.has(newMockSocket)).toBe(true);
    }
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);
    // One too many connections should return false and connections should not increase.
    const beyondMaxSocket = {} as Socket;
    expect(connectionManager.maybeAddConnection(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.has(beyondMaxSocket)).toBe(false);
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);
  });

  test("Old connection can be bumped.", () => {
    const oldestMockSocket = {} as Socket;
    expect(connectionManager.maybeAddConnection(oldestMockSocket)).toBe(true);
    expect(connectionManager.connections.has(oldestMockSocket)).toBe(true);
    // Fill connection list with 99 more.
    for (let i = 0; i < MAX_CONNECTIONS - 1; i++) {
      const newMockSocket = {} as Socket;
      expect(connectionManager.maybeAddConnection(newMockSocket)).toBe(true);
      expect(connectionManager.connections.has(newMockSocket)).toBe(true);
    }
    expect(connectionManager.connections.size).toBe(MAX_CONNECTIONS);

    vi.advanceTimersByTime(11000);

    const beyondMaxSocket = {} as Socket;
    // Add one connection beyond max:
    expect(connectionManager.maybeAddConnection(beyondMaxSocket)).toBe(true);
    // Expect it succeed since oldest can be bumped after at least 10 seconds.
    expect(connectionManager.connections.has(beyondMaxSocket)).toBe(true);
    // Expect oldest to have been removed and also passed into delete callback.
    expect(connectionManager.connections.has(oldestMockSocket)).toBe(false);
    expect(mockDeleteCallback).toHaveBeenCalledWith(oldestMockSocket);

  });
});
