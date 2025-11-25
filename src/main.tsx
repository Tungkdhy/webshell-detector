import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Import để setup axios interceptors sớm
import "./utils/axiosConfig";

createRoot(document.getElementById("root")!).render(<App />);