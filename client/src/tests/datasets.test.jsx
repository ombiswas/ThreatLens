import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext.jsx";
import { DatasetsPage } from "../features/datasets/DatasetsPage.jsx";
import { validateDatasetCsv } from "../features/datasets/csvValidator.js";
import { FEATURE_NAMES, MAX_FILE_SIZE_BYTES } from "../utils/constants.js";
import * as datasetApi from "../services/datasetApi.js";
import * as replayApi from "../services/replayApi.js";
import * as authHook from "../features/auth/useAuth.js";

// Mock API services
vi.mock("../services/datasetApi.js");
vi.mock("../services/replayApi.js");
vi.mock("../services/socket.js", () => ({
  onReplayProgress: vi.fn(() => () => {}),
  onNotificationNew: vi.fn(() => () => {}),
  onSocketStatusChange: vi.fn(() => () => {})
}));

const mockDatasets = [
  {
    _id: "ds-001",
    name: "CIC-IDS2017 Tuesday Infiltration",
    originalName: "Tuesday-WorkingHours.csv",
    rowCount: 5400,
    incidentCount: 142,
    classDistribution: { Benign: 5258, "DoS/DDoS": 142 },
    createdAt: "2026-03-10T10:00:00.000Z"
  }
];

function renderWithClient(ui) {
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

describe("Datasets & Traffic Replay Feature (Phase 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { _id: "usr-admin", name: "Admin Lead", role: "admin" },
      token: "mock-token",
      logout: vi.fn()
    });

    datasetApi.fetchDatasets.mockResolvedValue(mockDatasets);
    replayApi.fetchReplayStatus.mockResolvedValue({ activeReplay: null });
  });

  describe("CSV Client Validator (validateDatasetCsv)", () => {
    it("rejects undefined or missing file", async () => {
      const result = await validateDatasetCsv(null);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/no file selected/i);
    });

    it("rejects non-csv file extensions", async () => {
      const fakeFile = new File(["binary"], "malware.exe", { type: "application/octet-stream" });
      const result = await validateDatasetCsv(fakeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid file extension/i);
    });

    it("rejects files exceeding the 5MB size limit", async () => {
      const largeBlob = new Uint8Array(MAX_FILE_SIZE_BYTES + 1024);
      const largeFile = new File([largeBlob], "huge_flows.csv", { type: "text/csv" });
      const result = await validateDatasetCsv(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds the 5 MB limit/i);
    });

    it("rejects executable binary files with MZ headers", async () => {
      const mzHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
      const exeFile = new File([mzHeader], "fake.csv", { type: "text/csv" });
      const result = await validateDatasetCsv(exeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/executable or binary file detected/i);
    });

    it("rejects CSV with missing CIC-IDS2017 features", async () => {
      const incompleteHeader = "Destination Port,Flow Duration,Label\n80,1000,Benign\n";
      const incompleteFile = new File([incompleteHeader], "partial.csv", { type: "text/csv" });
      const result = await validateDatasetCsv(incompleteFile);
      expect(result.valid).toBe(false);
      expect(result.missingFeatures.length).toBeGreaterThan(0);
      expect(result.error).toMatch(/missing \d+ required CIC-IDS2017 features/i);
    });

    it("accepts valid CSV with all 67 required feature columns", async () => {
      const fullHeader = FEATURE_NAMES.join(",") + ",Label\n";
      const validFile = new File([fullHeader], "valid_flows.csv", { type: "text/csv" });
      const result = await validateDatasetCsv(validFile);
      expect(result.valid).toBe(true);
      expect(result.headerCount).toBeGreaterThanOrEqual(67);
    });
  });

  describe("DatasetsPage Component", () => {
    it("renders page header, replay session card, and upload dropzone", async () => {
      renderWithClient(<DatasetsPage />);

      expect(
        screen.getByRole("heading", { name: /dataset ingestion & traffic replay/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Traffic Replay Session")).toBeInTheDocument();
      expect(screen.getByText(/ingest network flow dataset/i)).toBeInTheDocument();
      expect(screen.getByText("Ingested Datasets")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("CIC-IDS2017 Tuesday Infiltration")).toBeInTheDocument();
      });
    });

    it("adjusts replay flow rate slider", async () => {
      renderWithClient(<DatasetsPage />);

      const slider = screen.getByLabelText(/replay flow rate slider/i);
      expect(slider).toBeInTheDocument();

      fireEvent.change(slider, { target: { value: "35" } });
      expect(screen.getByText("35 flows/sec")).toBeInTheDocument();
    });

    it("triggers replay session start when clicking Start Replay", async () => {
      replayApi.startReplaySession.mockResolvedValue({
        status: "success",
        session: { totalRows: 500, ratePerSecond: 25 }
      });

      renderWithClient(<DatasetsPage />);

      const startBtn = screen.getByRole("button", { name: /start replay/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(replayApi.startReplaySession).toHaveBeenCalledWith({
          datasetId: "demo",
          ratePerSecond: 25
        });
      });
    });

    it("restricts replay controls for Viewer role", async () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: { _id: "usr-viewer", name: "Viewer Person", role: "viewer" },
        token: "mock-token",
        logout: vi.fn()
      });

      renderWithClient(<DatasetsPage />);

      expect(
        screen.getByText(
          /Analyst or Administrator privileges required to start or halt traffic replay/i
        )
      ).toBeInTheDocument();

      const startBtn = screen.getByRole("button", { name: /start replay/i });
      expect(startBtn).toBeDisabled();
    });
  });
});
