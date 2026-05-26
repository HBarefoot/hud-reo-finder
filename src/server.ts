const PORT = Number(process.env.PORT ?? "8765");
const HTML_PATH = "/tmp/hud-reo-fl.html";

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const html = await Bun.file(HTML_PATH).text();
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Tracker not generated yet.", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  },
});

console.log(`HUD REO tracker serving at http://0.0.0.0:${PORT}`);
