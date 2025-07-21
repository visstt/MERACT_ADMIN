import { useState } from "react";
import styles from "./Sidebar.module.css";

function getMenuItems(user) {
  const items = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "📊",
      path: "/",
    },
    {
      id: "users",
      label: "User Management",
      icon: "👥",
      path: "/users",
    },
    {
      id: "streams",
      label: "Streams",
      icon: "📺",
      path: "/streams",
    },
    {
      id: "guilds",
      label: "Guilds",
      icon: "🏰",
      path: "/guilds",
    },
  ];
  if (user?.role?.name === "main admin") {
    items.push({
      id: "admins",
      label: "Admins",
      icon: "👮",
      path: "/admins",
    });
  }
  return items;
}

export const Sidebar = ({
  activeItem,
  onItemClick,
  collapsed = false,
  onToggle,
  open = false,
  user,
}) => {
  const userName = user?.login || user?.email || "Super Admin";
  const menuItems = getMenuItems(user);
  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
        open ? styles.open : ""
      }`}
    >
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎮</span>
          {!collapsed && <span className={styles.logoText}>Meract Admin</span>}
        </div>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li key={item.id} className={styles.menuItem}>
              <button
                className={`${styles.menuButton} ${
                  activeItem === item.path ? styles.active : ""
                }`}
                onClick={() => onItemClick(item.path)}
                title={collapsed ? item.label : ""}
              >
                <span className={styles.menuIcon}>{item.icon}</span>
                {!collapsed && (
                  <span className={styles.menuLabel}>{item.label}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>👤</div>
          {!collapsed && (
            <div className={styles.userDetails}>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userRole}>Administrator</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
