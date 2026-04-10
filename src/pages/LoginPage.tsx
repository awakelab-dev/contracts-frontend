import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import logoCor from "../assets/logo_cor_gestión_y_contratación_03_8.png";
import logoAwakelab from "../assets/logo_awakelab_powered_by_02.svg";
import loginBackground from "../assets/imagem_fundo_login.png";
type LoginLocationState = {
  from?: string;
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(username, password);
      const from = (location.state as LoginLocationState | null)?.from;
      navigate(typeof from === "string" && from.startsWith("/") ? from : "/");
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" && error !== null
          ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error ??
            (error as { message?: string }).message)
          : undefined;

      setError(errorMessage || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        px: 2,
        py: 6,
        backgroundImage: `linear-gradient(180deg, rgba(13, 43, 70, 0.74) 0%, rgba(13, 43, 70, 0.84) 100%), url(${loginBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: "min(460px, 100%)",
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(2px)",
          zIndex: 1,
        }}
      >
        <Stack spacing={2.4}>
          <Box
            component="img"
            src={logoCor}
            alt="Gestión y Contratación"
            sx={{
              width: "100%",
              maxWidth: 320,
              height: "auto",
              display: "block",
              mx: "auto",
              mb: 0.6,
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 0.5 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={submit}>
            <Stack spacing={2.2}>
              <TextField
                label="Nombre usuario"
                placeholder="User name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                size="small"
              />
              <TextField
                label="Contraseña"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 0.8,
                  py: 1.05,
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                {loading ? "Entrando…" : "Iniciar sesión"}
              </Button>
            </Stack>
          </form>

          <Box
            sx={{
              pt: 2.2,
              mt: 0.2,
              borderTop: "1px solid",
              borderColor: "rgba(35, 58, 86, 0.2)",
            }}
          >
            <Typography variant="body2" color="text.secondary" align="center">
              Contacta a tu administrador para acceder
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          position: "absolute",
          left: "50%",
          bottom: { xs: 18, sm: 30 },
          transform: "translateX(-50%)",
          zIndex: 1,
          width: { xs: 190, sm: 220 },
          maxWidth: "65vw",
        }}
      >
        <Box
          component="img"
          src={logoAwakelab}
          alt="Powered by Awakelab.world"
          sx={{
            width: "100%",
            height: "auto",
            display: "block",
            opacity: 0.92,
          }}
        />
      </Box>
    </Box>
  );
}
