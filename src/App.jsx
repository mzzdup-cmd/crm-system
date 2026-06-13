import {
  lazy,
  Suspense,
  useEffect,
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth }
from "./context/AuthContext";

import { ToastProvider }
from "./context/ToastContext";

import ProtectedRoute
from "./components/ProtectedRoute";

import LoadingState
from "./components/LoadingState";

import PageSkeleton
from "./components/PageSkeleton";

import LoginForm
from "./components/LoginForm.jsx";

import DashboardLayout
from "./layouts/DashboardLayout.jsx";

import DashboardPage
from "./pages/DashboardPage.jsx";

import {
  initMonitoring,
  setMonitoringUser,
} from "./services/monitoringService";

import {
  initErrorTracking,
} from "./services/errorTrackingService";

const SalesHubPage = lazy(
  () => import("./pages/SalesHubPage.jsx")
);

const SalaryHubPage = lazy(
  () => import("./pages/SalaryHubPage.jsx")
);

const AnalyticsHubPage = lazy(
  () => import("./pages/AnalyticsHubPage.jsx")
);

const ClientDetailsPage = lazy(
  () => import("./pages/ClientDetailsPage.jsx")
);

const NewPaymentPage = lazy(
  () => import("./pages/NewPaymentPage.jsx")
);

const ManagementPage = lazy(
  () => import("./pages/ManagementPage.jsx")
);

const UnauthorizedPage = lazy(
  () => import("./pages/UnauthorizedPage.jsx")
);

const NotificationsPage = lazy(
  () => import("./pages/NotificationsPage.jsx")
);

const PendingSalesPage = lazy(
  () => import("./pages/PendingSalesPage.jsx")
);

const TimeOffPage = lazy(
  () => import("./pages/TimeOffPage.jsx")
);

const TeamCalendarPage = lazy(
  () => import("./pages/TeamCalendarPage.jsx")
);

const KnowledgeBasePage = lazy(
  () => import("./pages/KnowledgeBasePage.jsx")
);

function LazyPage({ children }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  );
}

function AppRoutes() {

  const {
    user,
    userData,
    loading,
  } = useAuth();

  useEffect(() => {
    initMonitoring();
    initErrorTracking();
  }, []);

  useEffect(() => {
    if (userData) {
      setMonitoringUser({
        uid: userData.uid,
        role: userData.role,
        managerId: userData.managerId,
      });
    }
  }, [userData]);

  if (loading) {

    return (
      <LoadingState />
    );

  }

  if (!user) {

    return (
      <LoginForm />
    );

  }

  return (
    <BrowserRouter>

      <DashboardLayout>

        <Routes>

          <Route
            path="/"
            element={<DashboardPage />}
          />

          <Route
            path="/payments"
            element={
              <LazyPage>
                <SalesHubPage />
              </LazyPage>
            }
          />

          <Route
            path="/clients"
            element={
              <Navigate
                to="/payments?tab=clients"
                replace
              />
            }
          />

          <Route
            path="/deals"
            element={
              <Navigate
                to="/payments?tab=deals"
                replace
              />
            }
          />

          <Route
            path="/subscriptions"
            element={
              <Navigate
                to="/payments?tab=subscriptions"
                replace
              />
            }
          />

          <Route
            path="/salary"
            element={
              <LazyPage>
                <SalaryHubPage />
              </LazyPage>
            }
          />

          <Route
            path="/night-shifts"
            element={
              <Navigate
                to="/salary?tab=night-shifts"
                replace
              />
            }
          />

          <Route
            path="/bonuses"
            element={
              <Navigate
                to="/salary?tab=bonuses"
                replace
              />
            }
          />

          <Route
            path="/new-payment"
            element={
              <LazyPage>
                <NewPaymentPage />
              </LazyPage>
            }
          />

          <Route
            path="/client/:id"
            element={
              <LazyPage>
                <ClientDetailsPage />
              </LazyPage>
            }
          />

          <Route
            path="/analytics"
            element={
              <LazyPage>
                <ProtectedRoute requireAdmin>
                  <AnalyticsHubPage />
                </ProtectedRoute>
              </LazyPage>
            }
          />

          <Route
            path="/rating"
            element={
              <Navigate
                to="/analytics?tab=rating"
                replace
              />
            }
          />

          <Route
            path="/management"
            element={
              <LazyPage>
                <ProtectedRoute requireAdmin>
                  <ManagementPage />
                </ProtectedRoute>
              </LazyPage>
            }
          />

          <Route
            path="/traffic"
            element={
              <Navigate
                to="/management?tab=traffic"
                replace
              />
            }
          />

          <Route
            path="/pending-sales"
            element={
              <LazyPage>
                <PendingSalesPage />
              </LazyPage>
            }
          />

          <Route
            path="/notifications"
            element={
              <LazyPage>
                <NotificationsPage />
              </LazyPage>
            }
          />

          <Route
            path="/time-off"
            element={
              <LazyPage>
                <TimeOffPage />
              </LazyPage>
            }
          />

          <Route
            path="/calendar"
            element={
              <LazyPage>
                <TeamCalendarPage />
              </LazyPage>
            }
          />

          <Route
            path="/knowledge"
            element={
              <LazyPage>
                <KnowledgeBasePage />
              </LazyPage>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <LazyPage>
                <UnauthorizedPage />
              </LazyPage>
            }
          />

        </Routes>

      </DashboardLayout>

    </BrowserRouter>
  );

}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
