import { Navigate }
from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

import LoadingState
from "./LoadingState";

import { ROLES }
from "../constants/roles";

export default function ProtectedRoute({

  children,

  allowedRoles,

  requireAdmin = false,

  requireLeadership = false,

  fallbackPath = "/unauthorized",

}) {

  const {
    userData,
    loading,
  } = useAuth();

  if (loading) {

    return (
      <LoadingState />
    );

  }

  if (!userData) {

    return (
      <Navigate
        to="/"
        replace
      />
    );

  }

  let roles = allowedRoles;

  if (requireAdmin) {
    roles = [ROLES.ADMIN];
  } else if (requireLeadership) {
    roles = [ROLES.ADMIN, ROLES.ROP];
  }

  const hasAccess =
    roles?.includes(
      userData.role
    );

  return hasAccess

    ? children

    : (
      <Navigate
        to={fallbackPath}
        replace
      />
    );

}
