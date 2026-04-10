import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const queryClient = new QueryClient();
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#35b7c3",
      dark: "#2398a5",
      light: "#6ed9de",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#243f5e",
      dark: "#1a3249",
      contrastText: "#ffffff",
    },
    background: {
      default: "#eceef1",
      paper: "#ffffff",
    },
    text: {
      primary: "#233b57",
      secondary: "#5b6778",
    },
    info: { main: "#2a6f9e" },
    success: { main: "#3b8f62" },
    warning: { main: "#d38b34" },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Segoe UI", "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
    h5: {
      fontWeight: 900,
    },
    subtitle2: {
      fontWeight: 800,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#eceef1",
          color: "#233b57",
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderColor: "rgba(35, 59, 87, 0.16)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
        },
        outlined: {
          borderColor: "rgba(35, 59, 87, 0.28)",
          color: "#233b57",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#f7f9fa",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 800,
          color: "#233b57",
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
