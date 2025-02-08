import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "@/app/router";
import "@/app/styles/index.scss";

const root = ReactDOM.createRoot(document.getElementById("only-bitcoin") as HTMLElement);
root.render(<RouterProvider router={router} />);
