import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentSessionUser, isUserAdmin } from '../security/dataAccess';

const AdminRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentSessionUser();
      if (user) {
        const admin = await isUserAdmin(user.id);
        setIsAdmin(admin);
      }
      setChecking(false);
    };
    check();
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRouteGuard;
