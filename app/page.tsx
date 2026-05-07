import { Suspense } from "react";
import BillForm from "@/components/BillForm";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading workspace...</div>}>
      <BillForm />
    </Suspense>
  );
}
