import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served from https://sorena-labs.github.io/react-axis-drag/.
export default defineConfig({ base: "/react-axis-drag/", plugins: [react()] });
