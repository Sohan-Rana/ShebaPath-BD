import { Suspense } from "react";
import { ServicesBrowser } from "./services-browser";

export const metadata = { title: "সেবাসমূহ / Services" };

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesBrowser />
    </Suspense>
  );
}
