import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PurchaseOrderDetailsPage } from "@/features/phase-4-procure-to-pay/purchases/purchase-order-details-page";

export default async function PurchaseOrderDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <PurchaseOrderDetailsPage purchaseOrderId={id} />
      </Suspense>
    </RequireAuth>
  );
}
