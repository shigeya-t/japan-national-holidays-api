export function renderSwaggerHtml(spec: unknown): string {
  const specJson = JSON.stringify(spec).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>日本の祝日 API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *::before, *::after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .server-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 12px 20px;
      background: #1b1b1b;
      color: #fff;
      font-family: sans-serif;
      font-size: 14px;
    }
    .server-bar label { font-weight: 600; }
    .server-bar input {
      flex: 1;
      min-width: 16rem;
      padding: 8px 10px;
      border: 0;
      border-radius: 4px;
      font: inherit;
    }
    .server-bar button {
      padding: 8px 14px;
      border: 0;
      border-radius: 4px;
      background: #89bf04;
      color: #1b1b1b;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <form class="server-bar" id="server-form">
    <label for="server-url">Server</label>
    <input id="server-url" name="url" type="url" required placeholder="http://localhost:3000" />
    <button type="submit">適用</button>
  </form>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script>
    const spec = ${specJson};
    const builtinServers = Array.isArray(spec.servers) ? spec.servers.slice() : [];
    function defaultServer() {
      if (location.protocol === "file:" || location.origin === "null") {
        return "http://localhost:3000";
      }
      return location.origin;
    }
    function applyServer(url) {
      const normalized = url.replace(/\\/$/, "");
      if (!normalized) {
        spec.servers = builtinServers.slice();
      } else {
        const custom = { url: normalized, description: "指定したサーバー" };
        spec.servers = [custom, ...builtinServers.filter((server) => server.url !== custom.url)];
      }
      if (window.ui) {
        window.ui.specActions.updateJsonSpec(structuredClone(spec));
      }
    }
    document.getElementById("server-url").value = defaultServer();
    window.ui = SwaggerUIBundle({
      spec,
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
    document.getElementById("server-form").addEventListener("submit", (event) => {
      event.preventDefault();
      applyServer(document.getElementById("server-url").value.trim());
    });
  </script>
</body>
</html>
`;
}
