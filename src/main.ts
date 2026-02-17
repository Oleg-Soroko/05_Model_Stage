import "./styles.css";
import { mountApp } from "./app";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app container.");
}

void mountApp(app);

