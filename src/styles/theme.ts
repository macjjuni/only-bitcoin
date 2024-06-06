import { createTheme } from "@mui/material/styles";

const defaultFont = {
  typography: {
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
  },
};

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#f7931a",
    },
  },
  ...defaultFont,
});

export const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
  ...defaultFont,
});
