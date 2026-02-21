import { Routes, Route, NavLink } from "react-router-dom";
import { useTheme } from "./lib/theme";
import OverlapPage from "./components/OverlapPage";
import FundCardsPage from "./components/FundCardsPage";

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <NavLink to="/" end>Overlap Explorer</NavLink>
        <NavLink to="/funds">Fund Cards</NavLink>
        <span className="top-nav-spacer" />
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "\u2600" : "\u263D"}
        </button>
      </nav>
      <div className="app-page">
        <Routes>
          <Route path="/" element={<OverlapPage />} />
          <Route path="/funds" element={<FundCardsPage />} />
        </Routes>
      </div>
    </div>
  );
}
