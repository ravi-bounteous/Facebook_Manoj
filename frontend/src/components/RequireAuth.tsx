import { ReactElement, useCallback, useState } from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage, isTokenExpired } from "../api/tokenStorage";
import { config } from "../config";
import { useIdleTimeout } from "../hooks/useIdleTimeout";

export function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const [idle, setIdle] = useState(false);
  const handleIdle = useCallback(() => {
    tokenStorage.clear();
    setIdle(true);
  }, []);

  useIdleTimeout(config.idleTimeoutMs, handleIdle);

  const currentToken = tokenStorage.getAccessToken();

  if (idle || isTokenExpired(currentToken)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
