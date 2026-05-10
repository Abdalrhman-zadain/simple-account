import { redirect } from "next/navigation";

export default function Page() {
  redirect("/bank-cash-accounts?tab=receipts");
}
