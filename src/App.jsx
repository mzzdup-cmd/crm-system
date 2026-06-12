import {
  lazy,
  Suspense,
  useEffect,
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
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

const ClientsPage = lazy(
  () => import("./pages/ClientsPage.jsx")
);

const ClientDetailsPage = lazy(
  () => import("./pages/ClientDetailsPage.jsx")
);

const DealsPage = lazy(
  () => import("./pages/DealsPage.jsx")
);

const PaymentsPage = lazy(
  () => import("./pages/PaymentsPage.jsx")
);

const SalaryPage = lazy(
  () => import("./pages/SalaryPage.jsx")
);

const NewPaymentPage = lazy(
  () => import("./pages/NewPaymentPage.jsx")
);

const SubscriptionsPage = lazy(
  () => import("./pages/SubscriptionsPage.jsx")
);

const AdminAnalyticsPage = lazy(
  () => import("./pages/AdminAnalyticsPage.jsx")
);

const ManagementPage = lazy(
  () => import("./pages/ManagementPage.jsx")
);

const RatingPage = lazy(
  () => import("./pages/RatingPage.jsx")
);

const NightShiftsPage = lazy(
  () => import("./pages/NightShiftsPage.jsx")
);

const BonusesPage = lazy(
  () => import("./pages/BonusesPage.jsx")
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

const TrafficPage = lazy(
  () => import("./pages/TrafficPage.jsx")
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
            path="/clients"
            element={
              <LazyPage>
                <ClientsPage />
              </LazyPage>
            }
          />

          <Route
            path="/deals"
            element={
              <LazyPage>
                <DealsPage />
              </LazyPage>
            }
          />

          <Route
            path="/subscriptions"
            element={
              <LazyPage>
                <SubscriptionsPage />
              </LazyPage>
            }
          />

          <Route
            path="/payments"
            element={
              <LazyPage>
                <PaymentsPage />
              </LazyPage>
            }
          />

          <Route
            path="/salary"
            element={
              <LazyPage>
                <SalaryPage />
              </LazyPage>
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
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              </LazyPage>
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
              <LazyPage>
                <ProtectedRoute requireAdmin>
                  <TrafficPage />
                </ProtectedRoute>
              </LazyPage>
            }
          />

          <Route
            path="/rating"
            element={
              <LazyPage>
                <ProtectedRoute requireAdmin>
                  <RatingPage />
                </ProtectedRoute>
              </LazyPage>
            }
          />

          <Route
            path="/night-shifts"
            element={
              <LazyPage>
                <ProtectedRoute requireAdmin>
                  <NightShiftsPage />
                </ProtectedRoute>
              </LazyPage>
            }
          />

          <Route
            path="/bonuses"
            element={
              <LazyPage>
                <ProtectedRoute requireAdmin>
                  <BonusesPage />
                </ProtectedRoute>
              </LazyPage>
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
