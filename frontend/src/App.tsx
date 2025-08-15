import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  ThemeProvider,
  createTheme,
  Box,
} from "@mui/material";
import UploadForm from "./components/UploadForm";

const theme = createTheme({
  palette: { mode: "light", primary: { main: "#556cd6" } },
  shape: { borderRadius: 16 },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(8px)",
          background: "rgba(255,255,255,0.35)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Resume Match
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 背景 + 居中容器 */}
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)", // AppBar 高度
          display: "grid",
          placeItems: "center", // ⭐ 一句同时水平+垂直居中
          px: 2,
          background: `
      radial-gradient(1200px 600px at 10% 20%, rgba(85,108,214,0.18), transparent 60%),
      radial-gradient(1000px 500px at 90% 30%, rgba(111,207,151,0.18), transparent 60%),
      linear-gradient(180deg, #f7f8fc 0%, #eef1f7 100%)
    `,
        }}
      >
        <UploadForm />
      </Box>
    </ThemeProvider>
  );
}
