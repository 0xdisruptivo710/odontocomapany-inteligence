import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Toaster } from 'sonner';

function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

export const rootRoute = createRootRoute({ component: RootLayout });
