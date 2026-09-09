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
    .servers-with-custom {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      width: 100%;
    }
    .server-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      width: 100%;
      max-width: 40rem;
      font-family: sans-serif;
      font-size: 14px;
      color: #3b4151;
    }
    .server-bar label { font-weight: 600; }
    .server-bar input {
      flex: 1;
      min-width: 16rem;
      padding: 8px 10px;
      border: 1px solid #d8dde3;
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
  <template id="server-form-template">
    <form class="server-bar" id="server-form">
      <label for="server-url">任意の URL</label>
      <input id="server-url" name="url" type="url" required placeholder="http://localhost:3000" />
      <button type="submit">適用</button>
    </form>
  </template>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script>
    const spec = ${specJson};
    const builtinServers = Array.isArray(spec.servers) ? spec.servers.slice() : [];
    const sampleServer = "http://localhost:3000";
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
    function bindServerForm(form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        applyServer(form.elements.url.value.trim());
      });
      if (!form.elements.url.value) {
        form.elements.url.value = sampleServer;
      }
    }
    function mountServerBar() {
      if (document.querySelector("#swagger-ui #server-url")) return;
      const host = document.querySelector("#swagger-ui .servers");
      const template = document.getElementById("server-form-template");
      if (!host || !template) return;
      const form = template.content.firstElementChild.cloneNode(true);
      bindServerForm(form);
      host.after(form);
    }
    window.ui = SwaggerUIBundle({
      spec,
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout",
      plugins: [function customServerBarPlugin() {
        return {
          wrapComponents: {
            ServersContainer: function (Original, system) {
              const React = system.React;
              return function WrappedServers(props) {
                return React.createElement(
                  "div",
                  { className: "servers-with-custom" },
                  React.createElement(Original, props),
                  React.createElement(
                    "form",
                    {
                      className: "server-bar",
                      id: "server-form",
                      onSubmit: function (event) {
                        event.preventDefault();
                        applyServer(event.currentTarget.elements.url.value.trim());
                      }
                    },
                    React.createElement("label", { htmlFor: "server-url" }, "任意の URL"),
                    React.createElement("input", {
                      id: "server-url",
                      name: "url",
                      type: "url",
                      required: true,
                      placeholder: sampleServer,
                      defaultValue: sampleServer
                    }),
                    React.createElement("button", { type: "submit" }, "適用")
                  )
                );
              };
            }
          }
        };
      }],
      onComplete: mountServerBar
    });
  </script>
</body>
</html>
`;
}
