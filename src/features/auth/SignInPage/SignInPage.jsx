import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SignInPage.module.css";
import api from "../../../shared/lib/axios";

export const SignInPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/sign-in?role=admin", {
        email,
        password,
      });
      // Save user profile
      localStorage.setItem("profile", JSON.stringify(res.data));
      sessionStorage.setItem("profile", JSON.stringify(res.data));
      navigate("/");
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signInPage + " " + "signin-theme-wrapper"}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Sign In</h2>
        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};
