import * as React from "react";
import { AppBar, Box, CssBaseline, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SendIcon from "@mui/icons-material/Send";
import DownloadIcon from "@mui/icons-material/Download";
import EmailIcon from "@mui/icons-material/Email";
import InsightsIcon from "@mui/icons-material/Insights";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate, Outlet } from "react-router-dom";

const drawerWidth = 260;

const menu = [
  { to: "/", text: "Inicio", icon: <DashboardIcon /> },
  { to: "/students", text: "Alumnos", icon: <SchoolIcon /> },
  { to: "/companies", text: "Empresas", icon: <BusinessIcon /> },
  { to: "/vacancies", text: "Vacantes", icon: <WorkIcon /> },
  { to: "/matching", text: "Matching", icon: <HowToRegIcon /> },
  { to: "/invitations", text: "Invitaciones", icon: <SendIcon /> },
  { to: "/import", text: "Importación", icon: <DownloadIcon /> },
  { to: "/emails", text: "Plantillas Email", icon: <EmailIcon /> },
  { to: "/reports", text: "Informes", icon: <InsightsIcon /> },
  { to: "/settings", text: "Configuración", icon: <SettingsIcon /> },
];

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6">Contracts</Typography>
      </Toolbar>
      <Divider />
      <List>
        {menu.map((item) => (
          <ListItem key={item.to} disablePadding onClick={() => navigate(item.to)}>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">Gestión de Capacitación vs Contratación</Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", sm: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: "none", sm: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children ?? <Outlet />}
      </Box>
    </Box>
  );
}
