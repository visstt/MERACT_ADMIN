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
import { RanksPage } from "../pages/RanksPage";
import { ShopPage } from "../pages/ShopPage";
import { HeroVideoPage } from "../pages/HeroVideoPage";
import { AdminChatPage } from "../pages/AdminChatPage";
import { TasksPage } from "../pages/TasksPage";
import { IntroPage } from "../pages/IntroPage";
import { PoliciesPage } from "../pages/PoliciesPage";
import { SupportPage } from "../pages/SupportPage";
import { IconPacksPage } from "../pages/IconPacksPage";
import { CategoriesPage } from "../pages/CategoriesPage";
import { LocationRangesPage } from "../pages/LocationRangesPage";

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
  if (!isAuth) return <Navigate to="/admin/sign-in" replace />;
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
        localStorage.getItem("profile") || sessionStorage.getItem("profile"),
      );
    } catch {}
    setUser(profile);
  }, []);

  const handlePageChange = (pagePath) => {
    navigate(pagePath);
    setSidebarOpen(false); // close menu after navigation
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — still clear local state
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("profile");
      sessionStorage.removeItem("access");
      sessionStorage.removeItem("profile");
      document.cookie = "access_token=; Max-Age=0; path=/";
      document.cookie = "refresh_token=; Max-Age=0; path=/";
      navigate("/admin/sign-in", { replace: true });
    }
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
          onLogout={handleLogout}
        />
        <main className={styles.pageContent}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/streams" element={<StreamsPage />} />
            <Route path="/guilds" element={<GuildsPage />} />
            <Route path="/guild/:id" element={<GuildProfilePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/ranks" element={<RanksPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/chat" element={<AdminChatPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/intros" element={<IntroPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/icon-packs" element={<IconPacksPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route
              path="/location-ranges"
              element={<LocationRangesPage />}
            />
            {user?.role?.name === "main admin" && (
              <Route path="/admins" element={<AdminsPage />} />
            )}
            {user?.role?.name === "main admin" && (
              <Route path="/hero-video" element={<HeroVideoPage />} />
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
    <Route path="*" element={<Navigate to="/admin/" replace />} />
  </Routes>
);
