import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authApi } from "../../lib/apiClient";
import {
  clearAuthSession,
  getAccessToken,
  getStoredRole,
  saveAuthSession,
} from "../../lib/authSession";

function RoleProtectedRoute({ allowedRole, redirectTo }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      try {
        if (!getAccessToken()) {
          await authApi.refresh();
        }

        const meResponse = await authApi.me();
        const role = meResponse?.user?.role || getStoredRole();

        if (!role || role !== allowedRole) {
          throw new Error("Role mismatch");
        }

        saveAuthSession({
          accessToken: getAccessToken(),
          user: meResponse.user,
        });

        if (isMounted) {
          setStatus("authorized");
        }
      } catch (error) {
        clearAuthSession();
        if (isMounted) {
          setStatus("unauthorized");
        }
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [allowedRole]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ef] text-sm font-semibold text-slate-600">
        Verifying session...
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate replace state={{ from: location.pathname }} to={redirectTo} />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;
