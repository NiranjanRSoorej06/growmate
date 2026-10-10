import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Browser error reporting is opt-in: it only starts when VITE_SENTRY_DSN is set.
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  import("@sentry/react").then((Sentry) =>
    Sentry.init({ dsn, tracesSampleRate: 0.1, sendDefaultPii: false })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
