import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext.jsx";
import { DetectPage } from "../features/dashboard/DetectPage.jsx";
import * as detectApi from "../services/detectApi.js";

vi.mock("../services/detectApi.js");

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}

const mockDetectionResult = {
  mlClass: "DoS/DDoS",
  confidence: 0.984,
  probabilities: {
    Benign: 0.012,
    "DoS/DDoS": 0.984,
    PortScan: 0.003,
    BruteForce: 0.001
  },
  baselineClass: "DoS/DDoS",
  baselineRule: "SYN_FLOOD_DETECTED",
  score: 88,
  riskLevel: "Critical",
  explanation: [
    { factor: "High Threat Classification", description: "Classified as DoS/DDoS", points: 50 },
    { factor: "High ML Confidence", description: "Confidence exceeds 90%", points: 25 },
    { factor: "SYN Flood Signature", description: "Abnormal SYN flag ratio", points: 13 }
  ]
};

describe("Flow Detection Feature (DetectPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header, preset buttons, and initial ready state", () => {
    renderWithProviders(<DetectPage />);

    expect(screen.getByText("Single Flow Threat Detection")).toBeInTheDocument();
    expect(screen.getByText("Normal HTTPS Traffic")).toBeInTheDocument();
    expect(screen.getByText("DoS Hulk Flood")).toBeInTheDocument();
    expect(screen.getByText("Rapid PortScan Sweep")).toBeInTheDocument();
    expect(screen.getByText("FTP Brute Force (Patator)")).toBeInTheDocument();
    expect(screen.getByText("Ready for Analysis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run threat detection/i })).toBeInTheDocument();
  });

  it("loads a preset and updates active flow parameters", () => {
    renderWithProviders(<DetectPage />);

    // Click DoS Hulk preset
    const dosPresetBtn = screen.getByText("DoS Hulk Flood");
    fireEvent.click(dosPresetBtn);

    // Toast and footer both render preset label
    expect(screen.getAllByText(/DoS Hulk Flood/i).length).toBeGreaterThanOrEqual(2);
  });

  it("switches between Key Parameters form and Raw JSON editor", () => {
    renderWithProviders(<DetectPage />);

    const jsonTabBtn = screen.getByRole("button", { name: /all 67 features \(json\)/i });
    fireEvent.click(jsonTabBtn);

    expect(screen.getByPlaceholderText(/paste or edit flow json/i)).toBeInTheDocument();

    const keysTabBtn = screen.getByRole("button", { name: /key parameters/i });
    fireEvent.click(keysTabBtn);

    expect(screen.getByLabelText(/destination port/i)).toBeInTheDocument();
  });

  it("successfully executes detection and displays comprehensive threat analysis results", async () => {
    detectApi.detectSingleFlow.mockResolvedValueOnce(mockDetectionResult);

    renderWithProviders(<DetectPage />);

    const runBtn = screen.getByRole("button", { name: /run threat detection/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      // Classification badges (multiple instances across badge, comparison, and probabilities)
      expect(screen.getAllByText("DoS/DDoS").length).toBeGreaterThanOrEqual(1);
      // Risk badge
      expect(screen.getByText("Critical")).toBeInTheDocument();
      // Confidence (header and probability breakdown)
      expect(screen.getAllByText("98.4%").length).toBeGreaterThanOrEqual(1);
      // Threat Score
      expect(screen.getByText("88")).toBeInTheDocument();
      // ML vs Baseline
      expect(screen.getByText("Consensus Match")).toBeInTheDocument();
      expect(screen.getByText("SYN_FLOOD_DETECTED")).toBeInTheDocument();
      // Factors
      expect(screen.getByText("High Threat Classification")).toBeInTheDocument();
      expect(screen.getByText("+50 pts")).toBeInTheDocument();
    });

    expect(detectApi.detectSingleFlow).toHaveBeenCalledTimes(1);
  });

  it("handles detection execution failure gracefully", async () => {
    detectApi.detectSingleFlow.mockRejectedValueOnce(new Error("FastAPI ML service unavailable"));

    renderWithProviders(<DetectPage />);

    const runBtn = screen.getByRole("button", { name: /run threat detection/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("Analysis Error")).toBeInTheDocument();
      expect(screen.getByText("FastAPI ML service unavailable")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry analysis/i })).toBeInTheDocument();
    });
  });
});
