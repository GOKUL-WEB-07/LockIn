import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./app/AuthProvider";
import { AppRouter } from "./app/router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
