import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../database/database';

const RequireAuth = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setIsAuthenticated(Boolean(data.session));
      setIsChecking(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setIsAuthenticated(Boolean(session));
      setIsChecking(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-body">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
