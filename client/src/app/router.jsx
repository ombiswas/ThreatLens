import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { RegisterPage } from "../features/auth/RegisterPage.jsx";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import { RoleRoute } from "../features/auth/RoleRoute.jsx";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { NotFoundPage } from "../components/layout/NotFoundPage.jsx";

import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { IncidentsPage } from "../features/incidents/IncidentsPage.jsx";
import { DatasetsPage } from "../features/datasets/DatasetsPage.jsx";
import { EvaluationPage } from "../features/evaluation/EvaluationPage.jsx";
import { DetectPage } from "../features/dashboard/DetectPage.jsx";
import { UsersPage } from "../features/admin/UsersPage.jsx";
import { AuditLogsPage } from "../features/admin/AuditLogsPage.jsx";

export const router = createBrowserRouter([
  // Public Authentication Routes
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },

  // Protected SOC Application Routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: "dashboard",
        element: <DashboardPage />
      },
      {
        path: "incidents",
        element: <IncidentsPage />
      },
      {
        path: "datasets",
        element: <DatasetsPage />
      },
      {
        path: "evaluation",
        element: <EvaluationPage />
      },
      {
        path: "detect",
        element: (
          <RoleRoute allowedRoles={["admin", "analyst"]}>
            <DetectPage />
          </RoleRoute>
        )
      },
      {
        path: "admin/users",
        element: (
          <RoleRoute allowedRoles={["admin"]}>
            <UsersPage />
          </RoleRoute>
        )
      },
      {
        path: "admin/audit-logs",
        element: (
          <RoleRoute allowedRoles={["admin"]}>
            <AuditLogsPage />
          </RoleRoute>
        )
      },
      {
        path: "*",
        element: <NotFoundPage />
      }
    ]
  },

  // Fallback 404
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
