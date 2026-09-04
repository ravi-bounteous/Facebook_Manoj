import { useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";

export function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    authApi.logout();
    navigate("/login");
  }

  return (
    <button type="button" onClick={handleLogout}>
      Log Out
    </button>
  );
}
