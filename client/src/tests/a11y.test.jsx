import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { RiskBadge, StatusBadge, AttackClassBadge } from "../components/ui/Badge.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Shield } from "lucide-react";

describe("Accessibility (A11y) Audit via axe-core", () => {
  it("Button renders with no a11y violations", async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Submit Flow</Button>
        <Button variant="secondary" aria-label="Cancel operation">Cancel</Button>
        <Button variant="danger">Terminate Session</Button>
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Input and Select render with no a11y violations", async () => {
    const { container } = render(
      <div>
        <Input
          id="test-username"
          label="Operator Username"
          placeholder="e.g. jdoe"
          helperText="Enter your domain account"
        />
        <Select
          id="test-role"
          label="Security Role"
          options={[
            { value: "viewer", label: "Viewer" },
            { value: "analyst", label: "Analyst" }
          ]}
        />
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Badges render with multi-modal contrast and no a11y violations", async () => {
    const { container } = render(
      <div>
        <RiskBadge risk="Critical" />
        <RiskBadge risk="High" />
        <RiskBadge risk="Medium" />
        <RiskBadge risk="Low" />
        <StatusBadge status="Under Review" />
        <AttackClassBadge attackClass="DoS/DDoS" />
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Card and EmptyState render with no a11y violations", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Security Metrics</CardTitle>
          <CardDescription>Real-time flow telemetry</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Shield}
            title="No Incidents"
            description="Zero attack vectors detected in the selected time window."
          />
        </CardContent>
      </Card>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Table renders with accessible caption and header scope", async () => {
    const { container } = render(
      <Table
        caption="Sample Traffic Log"
        columns={[
          { key: "id", header: "ID" },
          { key: "proto", header: "Protocol" }
        ]}
        data={[
          { id: "1", proto: "TCP" },
          { id: "2", proto: "UDP" }
        ]}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Modal and ConfirmDialog render with no a11y violations", async () => {
    const { container } = render(
      <div>
        <Modal isOpen={true} onClose={() => {}} title="Triage Investigation">
          <p>Investigating potential volumetric flood attack pattern.</p>
        </Modal>
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete Dataset"
          description="Are you sure you want to remove this dataset capture?"
        />
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
