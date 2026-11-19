import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IncidentsPage } from "../features/incidents/IncidentsPage.jsx";
import { IncidentDetailModal } from "../features/incidents/IncidentDetailModal.jsx";
import { AuthContext } from "../features/auth/authContextDef.js";
import { ToastProvider } from "../context/ToastContext.jsx";
import * as incidentApi from "../services/incidentApi.js";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 }
    }
  });

describe("Incidents & Forensic Triage Components (Phase 9)", () => {
  let queryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui, role = "analyst") => {
    const authValue = {
      user: { id: "user-1", name: "Sarah Analyst", role, email: "sarah@soc.local" },
      token: "mock-jwt-token",
      isAuthenticated: true,
      isLoading: false
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>
            <BrowserRouter>{ui}</BrowserRouter>
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  describe("IncidentsPage", () => {
    it("renders filter toolbar, export button, and incidents table", async () => {
      const mockIncidents = [
        {
          _id: "inc-101",
          detectedAt: new Date().toISOString(),
          source: "192.168.1.50",
          destination: "10.0.0.1",
          protocol: "TCP",
          mlClass: "DoS/DDoS",
          score: 85,
          riskLevel: "Critical",
          status: "New"
        }
      ];

      vi.spyOn(incidentApi, "fetchIncidents").mockResolvedValueOnce({
        incidents: mockIncidents,
        total: 1,
        page: 1,
        totalPages: 1
      });

      renderWithProviders(<IncidentsPage />);

      expect(screen.getByText("Security Incident Repository")).toBeInTheDocument();
      expect(screen.getByLabelText(/search by ip/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("192.168.1.50")).toBeInTheDocument();
        expect(screen.getAllByText("DoS/DDoS").length).toBeGreaterThan(0);
        expect(screen.getByText("85")).toBeInTheDocument();
      });
    });

    it("triggers CSV export when Export button is clicked", async () => {
      const exportSpy = vi.spyOn(incidentApi, "exportIncidentsCsv").mockResolvedValueOnce();

      vi.spyOn(incidentApi, "fetchIncidents").mockResolvedValueOnce({
        incidents: [],
        total: 0,
        page: 1,
        totalPages: 1
      });

      renderWithProviders(<IncidentsPage />);

      const exportBtn = screen.getByRole("button", { name: /export csv/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(exportSpy).toHaveBeenCalled();
      });
    });
  });

  describe("IncidentDetailModal", () => {
    const mockIncidentDetail = {
      _id: "6afdb74f5ba1f77cf4d451aa",
      detectedAt: "2026-11-19T10:00:00.000Z",
      source: "172.16.0.1",
      destination: "192.168.10.50",
      protocol: "TCP",
      mlClass: "PortScan",
      confidence: 0.942,
      baselineClass: "Benign",
      score: 77,
      riskLevel: "High",
      status: "New",
      explanation: [
        {
          factor: "Class Base Severity Weight",
          contribution: 39,
          description: "PortScan base severity (0.65 x 60%)"
        },
        {
          factor: "Model Confidence Probability",
          contribution: 38,
          description: "94.2% model confidence (0.942 x 40%)"
        }
      ],
      notes: [
        {
          _id: "note-1",
          authorName: "Sarah Analyst",
          text: "SYN scan probe detected across low ports.",
          timestamp: "2026-11-19T10:05:00.000Z"
        }
      ]
    };

    it("renders explainable threat score breakdown and factor conservation", async () => {
      vi.spyOn(incidentApi, "fetchIncidentById").mockResolvedValueOnce(mockIncidentDetail);

      renderWithProviders(
        <IncidentDetailModal incidentId="6afdb74f5ba1f77cf4d451aa" isOpen onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText(/explainable threat score breakdown/i)).toBeInTheDocument();
        expect(screen.getByText("+39 pts")).toBeInTheDocument();
        expect(screen.getByText("+38 pts")).toBeInTheDocument();
        expect(
          screen.getByText(/conservation invariant: factors strictly sum to final score/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/total: 77/i)).toBeInTheDocument();
      });
    });

    it("renders ML vs Heuristic Baseline divergence alert", async () => {
      vi.spyOn(incidentApi, "fetchIncidentById").mockResolvedValueOnce(mockIncidentDetail);

      renderWithProviders(
        <IncidentDetailModal incidentId="6afdb74f5ba1f77cf4d451aa" isOpen onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText(/heuristic divergence/i)).toBeInTheDocument();
      });
    });

    it("allows Analyst to transition status and append investigation notes", async () => {
      vi.spyOn(incidentApi, "fetchIncidentById").mockResolvedValueOnce(mockIncidentDetail);
      const statusSpy = vi.spyOn(incidentApi, "updateIncidentStatus").mockResolvedValueOnce({
        ...mockIncidentDetail,
        status: "Under Review"
      });
      const noteSpy = vi.spyOn(incidentApi, "addIncidentNote").mockResolvedValueOnce({
        ...mockIncidentDetail,
        notes: [
          ...mockIncidentDetail.notes,
          {
            _id: "note-2",
            authorName: "Sarah Analyst",
            text: "Host IP flagged.",
            timestamp: new Date().toISOString()
          }
        ]
      });

      renderWithProviders(
        <IncidentDetailModal incidentId="6afdb74f5ba1f77cf4d451aa" isOpen onClose={() => {}} />,
        "analyst"
      );

      // Status transition button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /under review/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /under review/i }));
      await waitFor(() => {
        expect(statusSpy).toHaveBeenCalledWith("6afdb74f5ba1f77cf4d451aa", "Under Review");
      });

      // Post note
      const textarea = screen.getByPlaceholderText(/enter analytical forensic observations/i);
      fireEvent.change(textarea, { target: { value: "Host IP flagged." } });
      const postBtn = screen.getByRole("button", { name: /post note/i });
      fireEvent.click(postBtn);
      await waitFor(() => {
        expect(noteSpy).toHaveBeenCalledWith("6afdb74f5ba1f77cf4d451aa", "Host IP flagged.");
      });
    });

    it("disables status transition and note creation for Viewer role", async () => {
      vi.spyOn(incidentApi, "fetchIncidentById").mockResolvedValueOnce(mockIncidentDetail);

      renderWithProviders(
        <IncidentDetailModal incidentId="6afdb74f5ba1f77cf4d451aa" isOpen onClose={() => {}} />,
        "viewer"
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            /status transition controls are restricted to analyst and administrator/i
          )
        ).toBeInTheDocument();
        expect(
          screen.queryByPlaceholderText(/enter analytical forensic observations/i)
        ).not.toBeInTheDocument();
      });
    });
  });
});
