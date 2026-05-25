import PortalClient from "./portal-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client Portal — Matthews & Clark" };

export default function PortalPage({ searchParams }) {
  const clientId = searchParams?.c ? String(searchParams.c) : "";
  const token = searchParams?.t ? String(searchParams.t) : "";
  return <PortalClient initialClientId={clientId} initialToken={token} />;
}

