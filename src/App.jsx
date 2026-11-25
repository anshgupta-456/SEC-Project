import { useContext } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import AdminComplain from './components/admin_complain.jsx';
import AdminDashboard from './components/admin_dashboard.jsx';
import AppLayout from './components/AppLayout.jsx';
import Dashboard from './components/dashboard.jsx';
import Grienvancelist from './components/grienvancelist.jsx';
import NewGrievanceForm from './components/newgrievanceform.jsx';
import Profile from './components/profilecompt.jsx';
import Settings from './components/setting.jsx';
import { userContext } from './context/usercontext.jsx';
import LoginPage from './page/loginPage.jsx';

function RequireAuth() {
  const { isLoggedIn } = useContext(userContext);
  return isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const { isLoggedIn } = useContext(userContext);
  return isLoggedIn ? <Navigate to="/" replace /> : <Outlet />;
}

function ByRole({ student, admin }) {
  const { isAdmin } = useContext(userContext);
  return isAdmin ? admin : student;
}

const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage mode="login" /> },
      { path: '/signup', element: <LoginPage mode="signup" /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <ByRole student={<Grienvancelist />} admin={<AdminComplain />} /> },
      { path: '/dashboard', element: <ByRole student={<Dashboard />} admin={<AdminDashboard />} /> },
      { path: '/addGrievance', element: <ByRole student={<NewGrievanceForm />} admin={<Navigate to="/" replace />} /> },
      { path: '/profile', element: <Profile /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
