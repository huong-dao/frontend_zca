import type { Config } from "tailwindcss";
const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
          colors: {
            surface: {
              DEFAULT: "#f7f9fb",
              bright: "#f7f9fb",
              dim: "#d8dadc",
              variant: "#e0e3e5",
              tint: "#0053db",
              container: {
                lowest: "#ffffff",
                low: "#f2f4f6",
                DEFAULT: "#eceef0",
                high: "#e6e8ea",
                highest: "#e0e3e5",
              },
            },
      
            primary: {
              DEFAULT: "#004ac6",
              container: "#2563eb",
              fixed: "#dbe1ff",
              "fixed-dim": "#b4c5ff",
            },
      
            secondary: {
              DEFAULT: "#455f87",
              container: "#b5d0fd",
              fixed: "#d5e3ff",
              "fixed-dim": "#adc8f5",
            },
      
            tertiary: {
              DEFAULT: "#943700",
              container: "#bc4800",
              fixed: "#ffdbcd",
              "fixed-dim": "#ffb596",
            },
      
            error: {
              DEFAULT: "#ba1a1a",
              container: "#ffdad6",
            },
      
            background: "#f7f9fb",
      
            outline: {
              DEFAULT: "#737686",
              variant: "#c3c6d7",
            },
      
            inverse: {
              surface: "#2d3133",
              primary: "#b4c5ff",
              "on-surface": "#eff1f3",
            },
      
            on: {
              primary: {
                DEFAULT: "#ffffff",
                container: "#eeefff",
                fixed: "#00174b",
                "fixed-variant": "#003ea8",
              },
              secondary: {
                DEFAULT: "#ffffff",
                container: "#3e5980",
                fixed: "#001c3b",
                "fixed-variant": "#2d486d",
              },
              tertiary: {
                DEFAULT: "#ffffff",
                container: "#ffede6",
                fixed: "#360f00",
                "fixed-variant": "#7d2d00",
              },
              error: {
                DEFAULT: "#ffffff",
                container: "#93000a",
              },
              surface: {
                DEFAULT: "#191c1e",
                variant: "#434655",
              },
              background: "#191c1e",
            },
          },
      
          borderRadius: {
            DEFAULT: "0.125rem",
            lg: "0.25rem",
            xl: "0.5rem",
            full: "0.75rem",
          },
      
          fontFamily: {
            headline: ["Inter"],
            body: ["Inter"],
            label: ["Inter"],
          },
        },
    }
};
export default config;