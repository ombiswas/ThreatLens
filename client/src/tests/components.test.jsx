import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../components/ui/Button.jsx";
import { Badge, RiskBadge, StatusBadge } from "../components/ui/Badge.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Table } from "../components/ui/Table.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";

describe("Shared UI Components", () => {
  describe("Button Component", () => {
    it("renders text and handles click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Execute Query</Button>);

      const button = screen.getByRole("button", { name: /execute query/i });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("displays loading spinner and is disabled when isLoading is true", () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Submit Action
        </Button>
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Badge & RiskBadge Components", () => {
    it("renders distinct accessible RiskBadge with icon and label for Critical", () => {
      render(<RiskBadge risk="Critical" />);
      const badge = screen.getByLabelText("Risk Level: Critical");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Critical");
    });

    it("renders distinct RiskBadge for Low risk", () => {
      render(<RiskBadge risk="Low" />);
      const badge = screen.getByLabelText("Risk Level: Low");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Low");
    });

    it("renders status badge for Under Review", () => {
      render(<StatusBadge status="Under Review" />);
      expect(screen.getByText("Under Review")).toBeInTheDocument();
    });
  });

  describe("Input Component", () => {
    it("associates label with input using htmlFor and id", () => {
      render(<Input label="Target IP" id="target-ip" placeholder="192.168.1.1" />);
      const input = screen.getByLabelText(/target ip/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "target-ip");
    });

    it("renders error message and marks aria-invalid when error is provided", () => {
      render(<Input label="Email" error="Invalid email address" />);
      const input = screen.getByLabelText(/email/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email address");
    });
  });

  describe("Table Component", () => {
    const columns = [
      { key: "ip", header: "IP Address", sortable: true },
      { key: "score", header: "Threat Score", sortable: false }
    ];
    const data = [
      { id: "1", ip: "10.0.0.1", score: 85 },
      { id: "2", ip: "10.0.0.2", score: 15 }
    ];

    it("renders columns and rows properly", () => {
      render(<Table columns={columns} data={data} totalPages={1} totalItems={2} />);
      expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
      expect(screen.getByText("10.0.0.2")).toBeInTheDocument();
      expect(screen.getByText("Threat Score")).toBeInTheDocument();
    });

    it("calls onSort when sortable header is clicked", () => {
      const handleSort = vi.fn();
      render(
        <Table columns={columns} data={data} sortKey="ip" sortOrder="asc" onSort={handleSort} />
      );
      const sortButton = screen.getByRole("button", { name: /sort by ip address/i });
      fireEvent.click(sortButton);
      expect(handleSort).toHaveBeenCalledWith("ip", "desc");
    });
  });

  describe("Modal Component", () => {
    it("renders content and handles Escape key", () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen onClose={handleClose} title="Security Confirmation">
          <p>Confirm revocation of certificate?</p>
        </Modal>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Security Confirmation")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("does not render when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Hidden Dialog">
          <p>Not visible</p>
        </Modal>
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Tabs Component", () => {
    it("renders tab items and handles tab switching", () => {
      const handleChange = vi.fn();
      const tabs = [
        { id: "live", label: "Live Telemetry" },
        { id: "archived", label: "Historical Logs" }
      ];

      render(<Tabs tabs={tabs} activeTab="live" onChange={handleChange} />);

      const activeTab = screen.getByRole("tab", { name: /live telemetry/i });
      expect(activeTab).toHaveAttribute("aria-selected", "true");

      const inactiveTab = screen.getByRole("tab", { name: /historical logs/i });
      fireEvent.click(inactiveTab);
      expect(handleChange).toHaveBeenCalledWith("archived");
    });
  });
});
