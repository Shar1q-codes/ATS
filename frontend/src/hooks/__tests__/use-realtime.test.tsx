import { renderHook, act } from "@testing-library/react";
import { useRealtime, useApplicationRealtime } from "../use-realtime";
import { realtimeService } from "../../lib/realtime-service";
import { useAuth } from "../use-auth";

// Mock dependencies
jest.mock("../use-auth");
jest.mock("../../lib/realtime-service");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockRealtimeService = realtimeService as jest.Mocked<
  typeof realtimeService
>;

describe("useRealtime", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "user-1", firstName: "John", lastName: "Doe" },
      isAuthenticated: true,
      token: "mock-token",
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      loading: false,
      error: null,
    });

    mockRealtimeService.connect = jest.fn().mockResolvedValue(undefined);
    mockRealtimeService.disconnect = jest.fn();
    mockRealtimeService.on = jest.fn();
    mockRealtimeService.off = jest.fn();
    mockRealtimeService.joinApplication = jest.fn();
    mockRealtimeService.leaveApplication = jest.fn();
    mockRealtimeService.updateApplicationStage = jest.fn();
    mockRealtimeService.addApplicationNote = jest.fn();
    mockRealtimeService.editApplicationNote = jest.fn();
    mockRealtimeService.startTyping = jest.fn();
    mockRealtimeService.stopTyping = jest.fn();
  });

  it("should connect to realtime service when authenticated", async () => {
    const { result } = renderHook(() => useRealtime());

    expect(result.current.connectionState).toBe("connecting");

    await act(async () => {
      // Simulate successful connection
      const connectPromise = Promise.resolve();
      mockRealtimeService.connect.mockReturnValue(connectPromise);
      await connectPromise;
    });

    expect(mockRealtimeService.connect).toHaveBeenCalled();
  });

  it("should not connect when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      loading: false,
      error: null,
    });

    renderHook(() => useRealtime());

    expect(mockRealtimeService.connect).not.toHaveBeenCalled();
  });

  it("should handle connection errors", async () => {
    const error = new Error("Connection failed");
    mockRealtimeService.connect.mockRejectedValue(error);

    const { result } = renderHook(() => useRealtime());

    await act(async () => {
      try {
        await mockRealtimeService.connect();
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.error).toBe("Connection failed");
    expect(result.current.connectionState).toBe("disconnected");
  });

  it("should provide realtime service methods", () => {
    const { result } = renderHook(() => useRealtime());

    expect(typeof result.current.joinApplication).toBe("function");
    expect(typeof result.current.leaveApplication).toBe("function");
    expect(typeof result.current.updateApplicationStage).toBe("function");
    expect(typeof result.current.addApplicationNote).toBe("function");
    expect(typeof result.current.editApplicationNote).toBe("function");
    expect(typeof result.current.startTyping).toBe("function");
    expect(typeof result.current.stopTyping).toBe("function");
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useRealtime());

    unmount();

    expect(mockRealtimeService.disconnect).toHaveBeenCalled();
  });
});

describe("useApplicationRealtime", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "user-1", firstName: "John", lastName: "Doe" },
      isAuthenticated: true,
      token: "mock-token",
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      loading: false,
      error: null,
    });

    mockRealtimeService.connect = jest.fn().mockResolvedValue(undefined);
    mockRealtimeService.disconnect = jest.fn();
    mockRealtimeService.on = jest.fn();
    mockRealtimeService.off = jest.fn();
    mockRealtimeService.joinApplication = jest.fn();
    mockRealtimeService.leaveApplication = jest.fn();
    mockRealtimeService.startTyping = jest.fn();
    mockRealtimeService.stopTyping = jest.fn();
  });

  it("should join application when applicationId is provided", () => {
    const applicationId = "app-1";

    renderHook(() => useApplicationRealtime(applicationId));

    expect(mockRealtimeService.joinApplication).toHaveBeenCalledWith(
      applicationId
    );
  });

  it("should not join application when applicationId is null", () => {
    renderHook(() => useApplicationRealtime(null));

    expect(mockRealtimeService.joinApplication).not.toHaveBeenCalled();
  });

  it("should leave previous application when applicationId changes", () => {
    const { rerender } = renderHook(
      ({ applicationId }) => useApplicationRealtime(applicationId),
      { initialProps: { applicationId: "app-1" } }
    );

    expect(mockRealtimeService.joinApplication).toHaveBeenCalledWith("app-1");

    rerender({ applicationId: "app-2" });

    expect(mockRealtimeService.leaveApplication).toHaveBeenCalledWith("app-1");
    expect(mockRealtimeService.joinApplication).toHaveBeenCalledWith("app-2");
  });

  it("should manage typing indicator", () => {
    const applicationId = "app-1";
    const { result } = renderHook(() => useApplicationRealtime(applicationId));

    act(() => {
      result.current.handleTyping();
    });

    expect(mockRealtimeService.startTyping).toHaveBeenCalledWith(applicationId);

    act(() => {
      result.current.stopTypingIndicator();
    });

    expect(mockRealtimeService.stopTyping).toHaveBeenCalledWith(applicationId);
  });

  it("should track viewers", () => {
    const { result } = renderHook(() => useApplicationRealtime("app-1"));

    expect(result.current.viewers).toEqual([]);
    expect(result.current.typingUsers).toEqual([]);
  });

  it("should cleanup on unmount", () => {
    const applicationId = "app-1";
    const { unmount } = renderHook(() => useApplicationRealtime(applicationId));

    unmount();

    expect(mockRealtimeService.leaveApplication).toHaveBeenCalledWith(
      applicationId
    );
  });
});
