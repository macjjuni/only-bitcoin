import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "@/app/router";
import "@/app/styles/index.scss";
import "kku-ui/lib/styles/index.css";

const root = ReactDOM.createRoot(document.getElementById("only-bitcoin") as HTMLElement);
root.render(<RouterProvider router={router} />);
