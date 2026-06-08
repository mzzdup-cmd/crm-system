import { Navigate }
from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

export default function ProtectedRoute({

  children,

  allowedRoles,

}) {

  const { userData } = useAuth();

  if (!userData) {

    return null;

  }

  const hasAccess =

    allowedRoles.includes(
      userData.role
    );

  return hasAccess

    ? children

    : <Navigate to="/" />;

}