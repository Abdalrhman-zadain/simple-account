import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { SupplierDetailsPage } from "@/features/phase-4-procure-to-pay/purchases/supplier-details-page";

export default async function PurchaseSupplierDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <SupplierDetailsPage supplierId={id} />
      </Suspense>
    </RequireAuth>
  );
}
