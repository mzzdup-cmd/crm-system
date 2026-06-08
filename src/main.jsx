import React from "react";
import ReactDOM from "react-dom/client";
import { getAuth, onAuthStateChanged }
from "firebase/auth";
import {AuthProvider} 
from "./context/AuthContext";
import { useAuth }
from "./context/AuthContext";

import { useEffect, useState }
from "react";

import ProtectedRoute
from "./components/ProtectedRoute";

import NewPaymentPage
from "./pages/NewPaymentPage.jsx";

import SubscriptionsPage
from "./pages/SubscriptionsPage.jsx";

import NightShiftsPage
from "./pages/NightShiftsPage.jsx";

import BonusesPage
from "./pages/BonusesPage.jsx";

import {
  BrowserRouter,
  Routes,
 Route,
} from "react-router-dom";

import "./index.css";

import LoginForm from "./components/LoginForm.jsx";

import DashboardLayout from "./layouts/DashboardLayout.jsx";

import DashboardPage from "./pages/DashboardPage.jsx";
import ClientDetailsPage from "./pages/ClientDetailsPage.jsx";
import ClientsPage from "./pages/ClientsPage.jsx";
import DealsPage from "./pages/DealsPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import SalaryPage from "./pages/SalaryPage.jsx";
import RatingPage from "./pages/RatingPage.jsx";

function App() {

  const { user } = useAuth();

  return user ? (
    <BrowserRouter>

      <DashboardLayout>

        <Routes>

          <Route
  path="/rating"

  element={

    <ProtectedRoute
      allowedRoles={["admin"]}
    >

      <RatingPage />

    </ProtectedRoute>

  }
/>

          <Route
            path="/clients"
            element={<ClientsPage />}
          />

          <Route
            path="/deals"
            element={<DealsPage />}
          />

<Route
  path="/subscriptions"
  element={<SubscriptionsPage />}
/>

          <Route
            path="/payments"
            element={<PaymentsPage />}
          />

          <Route
  path="/night-shifts"
  element={<NightShiftsPage />}
/>

          <Route
            path="/salary"
            element={<SalaryPage />}
          />

          <Route
  path="/bonuses"
  element={<BonusesPage />}
/>

          <Route
            path="/rating"
            element={<RatingPage />}
          />

          <Route
            path="/client/:id"
            element={<ClientDetailsPage />}
          />

          <Route
  path="/new-payment"
  element={<NewPaymentPage />}
/>

          <Route
  path="/"
  element={<DashboardPage />}
/>

        </Routes>

      </DashboardLayout>

    </BrowserRouter>
  ) : (

  <LoginForm />

);
}


ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <AuthProvider>

  <App />

</AuthProvider>
  </React.StrictMode>
);