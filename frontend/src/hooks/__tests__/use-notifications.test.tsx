import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "../use-notifications";
import { useRealtime } from "../use-realtime";
import { apiClient } from "../../lib/api-client";

// Mock dependencies
jest.mock("../use-realtime");
jest.mock("../../lib/api-client");

const mockUseRealtime = useRealtime as jest.MockedFunction<typeof useRealtime>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("useNotifications", () => {
  const mockNotifications = [
    {
      id: "notification-1",
      type: "mention" as const,
      priority: "high" as const,
      title: "You were mentioned",
      message: "John mentioned you in a note",
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "notification-2",
      type: "application_stage_change" as const,
      priority: "medium" as const,
      title: "Application updated",
      message: "Application moved to screening",
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRealtime.mockReturnValue({
      connectionState: "connected",
      error: null,
      isConnected: true,
      addEventListener: jest.fn(),
      joinApplication: jest.fn(),
      leaveApplication: jest.fn(),
      updateApplicationStage: jest.fn(),
      addApplicationNote: jest.fn(),
      editApplicationNote: jest.fn(),
      startTyping: jest.fn(),
      stopTyping: jest.fn(),
    });

    mockApiClient.get = jest.fn();
    mockApiClient.put = jest.fn();
    mockApiClient.delete = jest.fn();
  });

  it("should load notifications on mount", async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { notifications: mockNotifications },
      },
    });

    mockApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { count: 1 },
      },
    });

    mockApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          emailNotifications: true,
          inAppNotifications: true,
          mentionNotifications: true,
          stageChangeNotifications: true,
          digestFrequency: "immediate",
        },
      },
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      // Wait for initial loads
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockApiClient.get).toHaveBeenCalledWith("/notifications", {
      params: {},
    });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/notifications/unread-count"
    );
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/notifications/preferences"
    );
  });

  it("should mark notification as read", async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { notifications: mockNotifications },
      },
    });

    mockApiClient.put.mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAsRead("notification-1");
    });

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/notifications/notification-1/read"
    );
  });

  it("should mark all notifications as read", async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { notifications: mockNotifications },
      },
    });

    mockApiClient.put.mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockApiClient.put).toHaveBeenCalledWith("/notifications/read-all");
  });

  it("should delete notification", async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { notifications: mockNotifications },
      },
    });

    mockApiClient.delete.mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.deleteNotification("notification-1");
    });

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      "/notifications/notification-1"
    );
  });

  it("should update preferences", async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          emailNotifications: true,
          inAppNotifications: true,
          mentionNotifications: true,
          stageChangeNotifications: true,
          digestFrequency: "immediate",
        },
      },
    });

    mockApiClient.put.mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useNotifications());

    const newPreferences = { emailNotifications: false };

    await act(async () => {
      await result.current.updatePreferences(newPreferences);
    });

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/notifications/preferences",
      newPreferences
    );
  });

  it("should handle API errors gracefully", async () => {
    const error = new Error("API Error");
    mockApiClient.get.mockRejectedValue(error);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe("API Error");
  });

  it("should listen for real-time notifications", () => {
    const mockAddEventListener = jest.fn();
    mockUseRealtime.mockReturnValue({
      connectionState: "connected",
      error: null,
      isConnected: true,
      addEventListener: mockAddEventListener,
      joinApplication: jest.fn(),
      leaveApplication: jest.fn(),
      updateApplicationStage: jest.fn(),
      addApplicationNote: jest.fn(),
      editApplicationNote: jest.fn(),
      startTyping: jest.fn(),
      stopTyping: jest.fn(),
    });

    renderHook(() => useNotifications());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "notification:new",
      expect.any(Function)
    );
  });

  it("should request notification permission", async () => {
    // Mock Notification API
    const mockNotification = {
      permission: "default",
      requestPermission: jest.fn().mockResolvedValue("granted"),
    };

    Object.defineProperty(window, "Notification", {
      value: mockNotification,
      writable: true,
    });

    const { result } = renderHook(() => useNotifications());

    const granted = await act(async () => {
      return await result.current.requestNotificationPermission();
    });

    expect(granted).toBe(true);
    expect(mockNotification.requestPermission).toHaveBeenCalled();
  });
});
