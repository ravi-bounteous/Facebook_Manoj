import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage, isTokenExpired } from "../api/tokenStorage";

export function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const accessToken = tokenStorage.getAccessToken();

  if (isTokenExpired(accessToken)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
