import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "../screens/LoginScreen";
import apiClient from "../services/api";

jest.mock("../services/api", () => ({
  __esModule: true,
  default: {
    auth: {
      login: jest.fn(),
    },
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    reset: jest.fn(),
    navigate: jest.fn(),
  }),
}));

describe("Login error messages", () => {
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  const submitLogin = (screen) => {
    fireEvent.changeText(screen.getByTestId("login-username-input"), "student");
    fireEvent.changeText(
      screen.getByTestId("login-password-input"),
      "wrong-password"
    );
    fireEvent.press(screen.getByTestId("login-submit-button"));
  };

  it("shows a friendly message for rejected credentials", async () => {
    apiClient.auth.login.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: "Internal authentication details" },
      },
    });

    submitLogin(render(<LoginScreen />));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Login Failed",
        "Credentials don't match. Please check your username/email and password."
      );
    });
  });

  it("shows a friendly connection message for network failures", async () => {
    apiClient.auth.login.mockRejectedValueOnce({ isNetworkError: true });

    submitLogin(render(<LoginScreen />));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Login Failed",
        "Unable to connect. Please try again later."
      );
    });
  });

  it("shows a friendly message for server failures", async () => {
    apiClient.auth.login.mockRejectedValueOnce({
      response: { status: 503, data: { error: "Internal server details" } },
    });

    submitLogin(render(<LoginScreen />));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Login Failed",
        "Unable to connect. Please try again later."
      );
    });
  });

  it("shows the credential message for an unsuccessful login response", async () => {
    apiClient.auth.login.mockResolvedValueOnce({
      data: { success: false, error: "Internal authentication details" },
    });

    submitLogin(render(<LoginScreen />));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Login Failed",
        "Credentials don't match. Please check your username/email and password."
      );
    });
  });
});
