import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PurchaseRequestDetailsPage } from "@/features/phase-4-procure-to-pay/purchases/purchase-request-details-page";

export default async function PurchaseRequestDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <PurchaseRequestDetailsPage purchaseRequestId={id} />
      </Suspense>
    </RequireAuth>
  );
}
