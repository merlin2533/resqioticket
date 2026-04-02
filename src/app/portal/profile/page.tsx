import { redirect } from "next/navigation";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const customer = await getCustomerFromRequest();
  if (!customer) redirect("/portal/login");
  return <ProfileClient customer={{ id: customer.id, name: customer.name, email: customer.email }} />;
}
