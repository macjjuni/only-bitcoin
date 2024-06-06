import { Container } from "@mui/material";
import { Outlet } from "react-router";
import { layout } from "@/styles/style";

const Main = () => {
  return (
    <Container component="main" className="main" sx={{ minHeight: `calc(100dvh - ${layout.main}px)` }}>
      <Outlet />
    </Container>
  );
};

export default Main;
