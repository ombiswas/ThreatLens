import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SummaryCards } from "../features/dashboard/SummaryCards.jsx";
import { TimelineChart } from "../features/dashboard/TimelineChart.jsx";
import { DistributionCharts } from "../features/dashboard/DistributionCharts.jsx";
import { TopSourcesTable } from "../features/dashboard/TopSourcesTable.jsx";
import { LiveFeedPanel, MAX_LIVE_FEED_ITEMS } from "../features/dashboard/LiveFeedPanel.jsx";
import * as socketService from "../services/socket.js";

// Mock Recharts ResponsiveContainer to avoid layout measuring issues in jsdom
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

describe("Dashboard Telemetry Components (Phase 9)", () => {
  describe("SummaryCards", () => {
    it("renders loading skeletons when isLoading is true", () => {
      const { container } = render(<SummaryCards summary={null} isLoading />);
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    it("renders formatted KPI numbers when summary data is provided", () => {
      const mockSummary = {
        totalEvents: 12500,
        attackCount: 3120,
        highCriticalCount: 840,
        criticalCount: 210,
        activeIncidents: 450,
        attackRatio: 0.2496
      };

      render(<SummaryCards summary={mockSummary} isLoading={false} />);

      expect(screen.getByText("12,500")).toBeInTheDocument();
      expect(screen.getByText("3,120")).toBeInTheDocument();
      expect(screen.getByText("840")).toBeInTheDocument();
      expect(screen.getByText("25.0%")).toBeInTheDocument();
    });
  });

  describe("TimelineChart", () => {
    it("renders empty state when timeline has no data", () => {
      render(<TimelineChart timeline={[]} interval="hour" isLoading={false} />);

      expect(screen.getByText(/no timeline telemetry available/i)).toBeInTheDocument();
      expect(screen.getByText("Threat Activity Timeline")).toBeInTheDocument();
    });

    it("renders chart and interval toggle buttons", () => {
      const handleInterval = vi.fn();
      const mockTimeline = [
        {
          timestamp: new Date().toISOString(),
          total: 15,
          byClass: { "DoS/DDoS": 10, PortScan: 5, BruteForce: 0 },
          avgScore: 78.5
        }
      ];

      render(
        <TimelineChart
          timeline={mockTimeline}
          interval="hour"
          onIntervalChange={handleInterval}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
      const minuteBtn = screen.getByRole("button", { name: "Minute" });
      fireEvent.click(minuteBtn);
      expect(handleInterval).toHaveBeenCalledWith("minute");
    });
  });

  describe("DistributionCharts", () => {
    it("renders empty state when distributions have no counts", () => {
      render(
        <DistributionCharts distribution={{ byClass: {}, byRiskLevel: {} }} isLoading={false} />
      );

      expect(screen.getByText(/no classification data/i)).toBeInTheDocument();
      expect(screen.getByText(/no risk data available/i)).toBeInTheDocument();
    });

    it("renders distribution charts when counts are populated", () => {
      const mockDist = {
        byClass: { "DoS/DDoS": 50, PortScan: 20, BruteForce: 10 },
        byRiskLevel: { Critical: 30, High: 25, Medium: 15, Low: 10 }
      };

      render(<DistributionCharts distribution={mockDist} isLoading={false} />);

      expect(screen.getByText("Attack Classification Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Risk Severity Distribution")).toBeInTheDocument();
      expect(screen.getAllByTestId("responsive-container").length).toBe(2);
    });
  });

  describe("TopSourcesTable", () => {
    it("renders empty message when top sources are empty", () => {
      render(<TopSourcesTable sources={[]} isLoading={false} />);
      expect(
        screen.getByText(/no attacking source ip telemetry recorded yet/i)
      ).toBeInTheDocument();
    });

    it("renders top sources and indicates masked IPs", () => {
      const mockSources = [
        {
          source: "192.168.1.***",
          incidentCount: 42,
          maxScore: 92,
          classes: ["DoS/DDoS", "PortScan"],
          lastSeen: new Date().toISOString()
        }
      ];

      render(<TopSourcesTable sources={mockSources} isLoading={false} />);

      expect(screen.getByText("192.168.1.***")).toBeInTheDocument();
      expect(screen.getByText("Masked")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("92")).toBeInTheDocument();
      expect(screen.getByText("DoS/DDoS")).toBeInTheDocument();
    });
  });

  describe("LiveFeedPanel (Socket.IO Stream)", () => {
    let mockSocket;
    let eventListeners;

    beforeEach(() => {
      eventListeners = {};
      mockSocket = {
        on: vi.fn((event, cb) => {
          eventListeners[event] = cb;
        }),
        off: vi.fn((event) => {
          delete eventListeners[event];
        })
      };

      vi.spyOn(socketService, "getSocket").mockReturnValue(mockSocket);
      vi.spyOn(socketService, "onSocketStatusChange").mockImplementation((cb) => {
        cb("connected");
        return () => {};
      });
    });

    it("renders live telemetry status and empty state initially", () => {
      render(<LiveFeedPanel />);

      expect(screen.getByText(/live attack flow stream/i)).toBeInTheDocument();
      expect(screen.getByText(/live telemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/listening on websocket/i)).toBeInTheDocument();
    });

    it("enforces capped list length (MAX_LIVE_FEED_ITEMS = 50) under high-speed streams", async () => {
      vi.useFakeTimers();

      render(<LiveFeedPanel />);

      expect(eventListeners["incident:new"]).toBeDefined();

      // Emit 70 incoming incident events through Socket.IO
      act(() => {
        for (let i = 1; i <= 70; i++) {
          eventListeners["incident:new"]({
            _id: `inc-${i}`,
            source: `10.0.0.${i}`,
            mlClass: "PortScan",
            score: 75,
            riskLevel: "High",
            detectedAt: new Date().toISOString()
          });
        }
      });

      // Advance timer by 300ms to allow batch buffer to flush
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Check the buffer status footer
      expect(
        screen.getByText(
          `Showing latest ${MAX_LIVE_FEED_ITEMS} of max ${MAX_LIVE_FEED_ITEMS} buffered events`
        )
      ).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("supports pause and resume of live telemetry feed", async () => {
      vi.useFakeTimers();

      render(<LiveFeedPanel />);

      const pauseBtn = screen.getByRole("button", { name: /^pause$/i });
      fireEvent.click(pauseBtn);

      // In paused state
      expect(screen.getByRole("button", { name: /resume \(0\)/i })).toBeInTheDocument();

      // Emit 5 events while paused
      act(() => {
        for (let i = 1; i <= 5; i++) {
          eventListeners["incident:new"]({
            _id: `inc-paused-${i}`,
            source: `192.168.1.${i}`,
            mlClass: "DoS/DDoS",
            score: 90,
            riskLevel: "Critical"
          });
        }
      });

      expect(screen.getByRole("button", { name: /resume \(5\)/i })).toBeInTheDocument();

      // Resume feed
      fireEvent.click(screen.getByRole("button", { name: /resume \(5\)/i }));
      expect(screen.getByRole("button", { name: /^pause$/i })).toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});
