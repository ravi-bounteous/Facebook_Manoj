import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage, isTokenExpired } from "../api/tokenStorage";

export function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const currentToken = tokenStorage.getAccessToken();

  if (isTokenExpired(currentToken)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
