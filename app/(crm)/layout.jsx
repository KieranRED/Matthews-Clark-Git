// CRM route group layout — scopes all CRM stylesheets to CRM routes only.
// mc-site pages go through app/layout.jsx directly, skipping this layout,
// which eliminates the render-blocking CSS bundle from the marketing site's
// critical rendering path and significantly improves LCP.

import "../globals.css";
import "../styles/lead-flow.css";
import "../styles/crm-kit.css";
import "../styles/invoice.css";
import "../styles/client-portal.css";

export default function CrmLayout({ children }) {
  return children;
}
