// Runs after "expo export": adds the app name, icons and install support to the website.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "dist", "index.html");
let html = fs.readFileSync(file, "utf8");

const tags = `
    <link rel="manifest" href="/macrowatch/manifest.json" />
    <link rel="icon" type="image/png" href="/macrowatch/favicon.png" />
    <link rel="apple-touch-icon" href="/macrowatch/apple-touch-icon.png" />
    <meta name="theme-color" content="#0a0c0e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="MacroWatch" />
    <style>
      html, body { background: #0a0c0e; color-scheme: dark; }
      * { scrollbar-width: thin; scrollbar-color: #2a3135 transparent; }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #2a3135; border-radius: 8px; border: 2px solid #0a0c0e; }
      :focus:not(:focus-visible) { outline: none; }
      :focus-visible { outline: 2px solid #3cc8c0; outline-offset: 2px; }
    </style>
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => navigator.serviceWorker.register("/macrowatch/sw.js", { scope: "/macrowatch/" }));
      }
    </script>
  `;

if (!html.includes('rel="manifest"')) {
  html = html.replace("</head>", `${tags}</head>`);
  fs.writeFileSync(file, html);
  console.log("Added install support to dist/index.html");
} else {
  console.log("Install support already present");
}
