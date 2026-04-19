import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import AgentPage from "./pages/AgentPage.jsx";
import AppFooter from "./components/AppFooter.jsx";
import PromptShieldDemoPage from "./pages/PromptShieldDemoPage.jsx";

function Protected({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Layout({ children }) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <header>
        <h1 style={{ marginTop: 0 }}>TaskBoard</h1>
        <p className="muted">Conflict lane ALPHA — same line intentionally modified in sibling branches</p>
        <nav>
          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
                Login
              </NavLink>
              <NavLink to="/signup" className={({ isActive }) => (isActive ? "active" : "")}>
                Sign up
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                Dashboard
              </NavLink>
              <NavLink to="/agent" className={({ isActive }) => (isActive ? "active" : "")}>
                Agent Playground
              </NavLink>
              <NavLink to="/promptshield-demo" className={({ isActive }) => (isActive ? "active" : "")}>
                PromptShield Demo
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Log out
              </button>
            </>
          )}
        </nav>
      </header>
      {children}
      <AppFooter />
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/agent"
          element={
            <Protected>
              <AgentPage />
            </Protected>
          }
        />
        <Route
          path="/promptshield-demo"
          element={
            <Protected>
              <PromptShieldDemoPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
