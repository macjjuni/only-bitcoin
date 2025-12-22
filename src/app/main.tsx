import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "@/app/router";

import "kku-ui/index.css";
import "@/app/styles/index.scss";

const { browserRouter } = router;
const root = ReactDOM.createRoot(document.getElementById("only-bitcoin") as HTMLElement);

root.render(<RouterProvider router={browserRouter} />);
