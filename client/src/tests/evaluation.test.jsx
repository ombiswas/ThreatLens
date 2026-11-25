import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext.jsx";
import { EvaluationPage } from "../features/evaluation/EvaluationPage.jsx";
import * as datasetApi from "../services/datasetApi.js";
import * as evalApi from "../services/evaluationApi.js";

// Mock Recharts ResponsiveContainer to avoid layout measuring in jsdom
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: "100%", height: "300px" }}>
        {children}
      </div>
    )
  };
});

vi.mock("../services/datasetApi.js");
vi.mock("../services/evaluationApi.js");

const mockModelInfo = {
  model_name: "Random Forest Flow Classifier",
  algorithm: "RandomForestClassifier",
  version: "0.1.0",
  feature_count: 67,
  classes: ["Benign", "DoS/DDoS", "PortScan", "BruteForce"],
  evaluation_metrics: {
    accuracy: 0.984,
    macro_f1: 0.962
  }
};

const mockEvalData = {
  status: "success",
  data: {
    datasetId: "demo",
    datasetName: "CIC-IDS2017 Demo Sample",
    totalEvaluated: 1000,
    classes: ["Benign", "DoS/DDoS", "PortScan", "BruteForce"],
    mlModel: {
      algorithm: "RandomForestClassifier",
      accuracy: 0.984,
      macroF1: 0.962,
      macroPrecision: 0.971,
      macroRecall: 0.954,
      weightedF1: 0.983,
      perClass: {
        Benign: { precision: 0.99, recall: 0.99, f1Score: 0.99, support: 600 },
        "DoS/DDoS": { precision: 0.96, recall: 0.94, f1Score: 0.95, support: 200 },
        PortScan: { precision: 0.98, recall: 0.96, f1Score: 0.97, support: 120 },
        BruteForce: { precision: 0.95, recall: 0.93, f1Score: 0.94, support: 80 }
      },
      confusionMatrix: {
        Benign: { Benign: 594, "DoS/DDoS": 4, PortScan: 2, BruteForce: 0 },
        "DoS/DDoS": { Benign: 8, "DoS/DDoS": 188, PortScan: 4, BruteForce: 0 },
        PortScan: { Benign: 4, "DoS/DDoS": 0, PortScan: 115, BruteForce: 1 },
        BruteForce: { Benign: 5, "DoS/DDoS": 0, PortScan: 1, BruteForce: 74 }
      },
      falsePositivesCount: 1,
      falsePositivesExamples: [
        {
          incidentId: "inc-fp-1",
          trueLabel: "Benign",
          predictedClass: "DoS/DDoS",
          threatScore: 82,
          confidence: 0.88
        }
      ],
      falseNegativesCount: 1,
      falseNegativesExamples: [
        {
          rowNumber: 42,
          trueLabel: "PortScan",
          expectedClass: "PortScan",
          predictedClass: "Benign"
        }
      ]
    },
    baseline: {
      algorithm: "RuleBasedBaseline",
      accuracy: 0.62,
      macroF1: 0.4695,
      macroPrecision: 0.5203,
      macroRecall: 0.5208,
      weightedF1: 0.612,
      perClass: {
        Benign: { precision: 0.65, recall: 0.85, f1Score: 0.735, support: 600 },
        "DoS/DDoS": { precision: 0.4, recall: 0.09, f1Score: 0.143, support: 200 },
        PortScan: { precision: 0.0, recall: 0.0, f1Score: 0.0, support: 120 },
        BruteForce: { precision: 1.0, recall: 1.0, f1Score: 1.0, support: 80 }
      }
    },
    discrepancyCount: 2,
    discrepancyExamples: []
  }
};

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

describe("Comparative Evaluation Feature (Phase 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    datasetApi.fetchDatasets.mockResolvedValue([]);
    evalApi.fetchLatestModelInfo.mockResolvedValue(mockModelInfo);
    evalApi.fetchDatasetEvaluation.mockResolvedValue(mockEvalData);
  });

  it("renders model architecture cards and evaluation header", async () => {
    renderWithClient(<EvaluationPage />);

    expect(
      screen.getByRole("heading", { name: /comparative evaluation & benchmarking/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Random Forest Classifier")).toBeInTheDocument();
    expect(screen.getByText("67 Statistical Features")).toBeInTheDocument();
    expect(screen.getByText("Calibrated Rule Engine")).toBeInTheDocument();
  });

  it("renders comparative performance metrics table", async () => {
    renderWithClient(<EvaluationPage />);

    await waitFor(() => {
      expect(screen.getByText("Overall Accuracy")).toBeInTheDocument();
      expect(screen.getByText("Macro F1-Score")).toBeInTheDocument();
      expect(screen.getByText("Macro Precision")).toBeInTheDocument();
      expect(screen.getByText("Macro Recall")).toBeInTheDocument();
    });

    // Check ML Accuracy (98.4%) and Baseline Accuracy (62.0%)
    expect(screen.getByText("98.4%")).toBeInTheDocument();
    expect(screen.getByText("62.0%")).toBeInTheDocument();
  });

  it("renders multi-class confusion matrix heatmap", async () => {
    renderWithClient(<EvaluationPage />);

    await waitFor(() => {
      expect(screen.getByText("Random Forest Confusion Matrix")).toBeInTheDocument();
    });

    const matrixTable = screen.getByLabelText(/multi-class confusion matrix heatmap/i);
    expect(matrixTable).toBeInTheDocument();

    // Check diagonal TP value (594 for Benign-Benign)
    expect(screen.getByText("594")).toBeInTheDocument();
    expect(screen.getByText("188")).toBeInTheDocument();
  });

  it("renders discrepancy tables for false positives and false negatives", async () => {
    renderWithClient(<EvaluationPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/false positive instances \(benign traffic flagged as attack\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/false negative instances \(attacks classified as benign\)/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Inspect Incident →")).toBeInTheDocument();
    expect(screen.getByText("Row 42")).toBeInTheDocument();
  });

  it("renders honest operational limitations panel with 4 core caveats", async () => {
    renderWithClient(<EvaluationPage />);

    await waitFor(() => {
      expect(screen.getByText(/real-world operational limitations & caveats/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/offline flow termination dependency/i)).toBeInTheDocument();
    expect(screen.getByText(/synthetic testbed artifacts/i)).toBeInTheDocument();
    expect(screen.getByText(/extreme production class imbalance/i)).toBeInTheDocument();
    expect(screen.getByText(/rule-based heuristic baseline fragility/i)).toBeInTheDocument();
  });
});
