import * as React from "react";
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoCorBranca from "../assets/logo_cor_branca_gestión_y_contratación_03_1_8.png";
import iconAlumnos from "../assets/icons/alumnos.svg";
import iconCerrarSesion from "../assets/icons/cerrar_sesion.svg";
import iconEmpresas from "../assets/icons/empresas.svg";
import iconEntrevistas from "../assets/icons/entrevistas.svg";
import iconConfiguracion from "../assets/icons/gestion_y_contratación_14.svg";
import iconImportacion from "../assets/icons/importacion.svg";
import iconInformes from "../assets/icons/informes.svg";
import iconInicio from "../assets/icons/inicio.svg";
import iconInvitaciones from "../assets/icons/invitaciones.svg";
import iconLiquidacion from "../assets/icons/liquidacion.svg";
import iconMatching from "../assets/icons/matching.svg";
import iconPlantillasEmail from "../assets/icons/plantillas_email.svg";
import iconUsuario from "../assets/icons/usuario.svg";
import iconVacantes from "../assets/icons/vacantes.svg";

const drawerWidth = 286;

type MenuItem = {
  to: string;
  text: string;
  icon: string;
};

const menu: MenuItem[] = [
  { to: "/", text: "INICIO", icon: iconInicio },
  { to: "/students", text: "ALUMNOS", icon: iconAlumnos },
  { to: "/courses", text: "CURSOS", icon: iconImportacion },
  { to: "/companies", text: "EMPRESAS", icon: iconEmpresas },
  { to: "/vacancies", text: "VACANTES", icon: iconVacantes },
  { to: "/matching", text: "MATCHING", icon: iconMatching },
  { to: "/interviews", text: "ENTREVISTAS", icon: iconEntrevistas },
  { to: "/invitations", text: "INVITACIONES", icon: iconInvitaciones },
  { to: "/import", text: "IMPORTACIÓN", icon: iconImportacion },
  { to: "/emails", text: "PLANTILLAS EMAIL", icon: iconPlantillasEmail },
  { to: "/liquidacion", text: "LIQUIDACIÓN", icon: iconLiquidacion },
  { to: "/reports", text: "INFORMES", icon: iconInformes },
  { to: "/settings", text: "CONFIGURACIÓN", icon: iconConfiguracion },
];

function isPathSelected(pathname: string, targetPath: string) {
  if (targetPath === "/") return pathname === "/";
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

function SidebarIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <Box
      component="img"
      className="sidebar-menu-icon"
      src={src}
      alt={alt}
      sx={{
        width: 40,
        height: 40,
        display: "block",
        objectFit: "contain",
        filter: "none",
        transition: "filter 140ms ease-in-out",
      }}
    />
  );
}

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const drawer = (
    <Box sx={{ p: 1.8, height: "100%", bgcolor: "#eff1f4" }}>
      <Paper
        sx={{
          p: 1.6,
          borderRadius: 1.6,
          height: "100%",
          bgcolor: "#f2f3f5",
          overflowY: "auto",
        }}
      >
        <List disablePadding>
          {menu.map((item) => {
            const selected = isPathSelected(location.pathname, item.to);

            return (
              <ListItem key={item.to} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={selected}
                  onClick={() => {
                    navigate(item.to);
                    setMobileOpen(false);
                  }}
                  sx={{
                    minHeight: 56,
                    px: 1.4,
                    borderRadius: 0.8,
                    border: "1px solid",
                    borderColor: selected ? "primary.main" : "rgba(35, 58, 86, 0.24)",
                    bgcolor: selected ? "primary.main" : "#f9fafb",
                    color: selected ? "common.white" : "secondary.main",
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "common.white",
                      borderColor: "primary.main",
                    },
                    "&:hover": {
                      bgcolor: "primary.main",
                      color: "common.white",
                      borderColor: "primary.main",
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: "primary.main",
                      color: "common.white",
                      borderColor: "primary.main",
                    },
                    "&.Mui-selected .sidebar-menu-icon, &:hover .sidebar-menu-icon": {
                      filter: "brightness(0) invert(1)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48, color: "inherit" }}>
                    <SidebarIcon src={item.icon} alt={item.text} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: 14,
                      lineHeight: 1.15,
                      fontWeight: selected ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          bgcolor: "secondary.main",
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1.5, display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            src={logoCorBranca}
            alt="Gestión y Contratación"
            sx={{
              width: { xs: 192, sm: 255 },
              height: "auto",
              display: "block",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onClick={() => navigate("/")}
          />

          <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: "auto", pl: 1 }}>
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="center"
              sx={{ display: { xs: "none", md: "flex" } }}
            >
              <Box component="img" src={iconUsuario} alt="Usuario" sx={{ width: 40, height: 40, display: "block" }} />
              <Typography variant="body2" sx={{ color: "common.white" }}>
                {user?.username || "Usuario"}
              </Typography>
            </Stack>

            <Button
              variant="contained"
              size="small"
              onClick={handleLogout}
              disabled={loggingOut}
              startIcon={<Box component="img" src={iconCerrarSesion} alt="" sx={{ width: 36, height: 36, display: "block" }} />}
              sx={{
                minWidth: 132,
                borderRadius: 0.8,
                bgcolor: "primary.main",
                color: "common.white",
                px: 1.4,
                py: 0.7,
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "primary.dark",
                  boxShadow: "none",
                },
                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.85)",
                  backgroundColor: "rgba(48, 216, 216, 0.45)",
                },
              }}
            >
              {loggingOut ? "Cerrando…" : "Cerrar sesión"}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "#eff1f4",
              borderRight: "1px solid rgba(35, 58, 86, 0.22)",
              overflow: "hidden",
            },
          }}
        >
          <Toolbar />
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "#eff1f4",
              borderRight: "1px solid rgba(35, 58, 86, 0.22)",
              overflow: "hidden",
            },
          }}
          open
        >
          <Toolbar />
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Toolbar />
        {children ?? <Outlet />}
      </Box>
    </Box>
  );
}
