import { Typography, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Error = () => {
  const navigate = useNavigate();

  return (
    <Stack className="error-page">
      <Typography component="h1" align="center" fontSize={34} fontWeight="bold" mt={4}>
        404 - Not Found
      </Typography>
      <Stack flexDirection="row" justifyContent="center" py={4}>
        <Button
          variant="contained"
          sx={{ width: "120px" }}
          onClick={() => {
            navigate("/");
          }}
        >
          Go Home
        </Button>
      </Stack>
    </Stack>
  );
};

export default Error;
