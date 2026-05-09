export const dynamic = "force-static";

export async function GET() {
  const manifest = {
    name: "Matthews & Clark CRM",
    short_name: "M&C CRM",
    description: "Lead flow + CRM for Matthews & Clark",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}

