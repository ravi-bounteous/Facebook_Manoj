import { ReactElement, useCallback, useState } from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage, isTokenExpired } from "../api/tokenStorage";
import { config } from "../config";
import { useIdleTimeout } from "../hooks/useIdleTimeout";

export function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const [, forceRender] = useState(0);
  const handleIdle = useCallback(() => {
    tokenStorage.clear();
    forceRender((n) => n + 1);
  }, []);

  useIdleTimeout(config.idleTimeoutMs, handleIdle);

  const currentToken = tokenStorage.getAccessToken();

  if (isTokenExpired(currentToken)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
