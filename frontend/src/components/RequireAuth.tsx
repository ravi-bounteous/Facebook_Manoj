import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { tokenStorage, isTokenExpired } from "../api/tokenStorage";

export function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const currentToken = tokenStorage.getAccessToken();
  const location = useLocation();

  if (isTokenExpired(currentToken)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
