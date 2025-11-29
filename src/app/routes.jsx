import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { StreamsPage } from "../pages/StreamsPage";
import { GuildsPage } from "../pages/GuildsPage/GuildsPage";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage";
import { UsersPage } from "../pages/UsersPage/UsersPage";
import { SignInPage } from "../features/auth/SignInPage/SignInPage";
import { Header } from "../widgets/Header/Header";
import { Sidebar } from "../widgets/Sidebar/Sidebar";
import styles from "./App.module.css";
import { useState, useEffect } from "react";
import api from "../shared/lib/axios";
import { GuildProfilePage } from "../pages/GuildProfilePage/GuildProfilePage";
import { AdminsPage } from "../pages/AdminsPage/AdminsPage";
import { AchievementsPage } from "../pages/AchievementsPage";

function getAccessToken() {
  // Example: look for cookie named access_token (or another name if server uses different one)
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("access_token="));
}

function ProtectedRoute({ children }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      let hasToken = getAccessToken();
      if (!hasToken) {
        try {
          await api.post("/auth/refresh");
        } catch {
          setIsAuth(false);
          setAuthChecked(true);
          return;
        }
        hasToken = getAccessToken();
      }
      setIsAuth(!!hasToken);
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  if (!authChecked) return null;
  if (!isAuth) return <Navigate to="/sign-in" replace />;
  return children;
}

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get profile from localStorage/sessionStorage if present
    let profile = null;
    try {
      profile = JSON.parse(
        localStorage.getItem("profile") || sessionStorage.getItem("profile")
      );
    } catch {}
    setUser(profile);
  }, []);

  const handlePageChange = (pagePath) => {
    navigate(pagePath);
    setSidebarOpen(false); // close menu after navigation
  };
  const handleBurger = () => setSidebarOpen(true);
  const handleCloseSidebar = () => setSidebarOpen(false);
  const isMobile = window.innerWidth <= 768;
  return (
    <div className={styles.app}>
      <div
        className={
          styles.sidebarContainer +
          (isMobile ? (sidebarOpen ? " " + styles.open : "") : "")
        }
      >
        <Sidebar
          activeItem={location.pathname}
          onItemClick={handlePageChange}
          user={user}
          {...(isMobile ? { open: sidebarOpen } : {})}
        />
      </div>
      <div className={styles.mainContent}>
        <Header
          onToggleSidebar={handleBurger}
          isSidebarOpen={sidebarOpen}
          user={user}
        />
        <main className={styles.pageContent}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/streams" element={<StreamsPage />} />
            <Route path="/guilds" element={<GuildsPage />} />
            <Route path="/guild/:id" element={<GuildProfilePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            {user?.role?.name === "main admin" && (
              <Route path="/admins" element={<AdminsPage />} />
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export const AppRoutes = () => (
  <Routes>
    <Route path="/admin/sign-in" element={<SignInPage />} />
    <Route
      path="/admin/*"
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    />
  </Routes>
);
