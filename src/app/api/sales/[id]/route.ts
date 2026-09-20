import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-helpers";
import { SaleRepository } from "@/repositories/sale.repository";

const repo = new SaleRepository();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("sales.view");
    const tenantId = session.user.tenantId || "default";

    const { id } = await params;
    let sale = await repo.findById(id, tenantId);
    if (!sale) {
      sale = await repo.findByInvoice(id, tenantId);
    }
    if (!sale) return apiError("Sale record not found", 404);

    return apiSuccess(sale);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Unauthorized", 401);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("sales.manage");
    const tenantId = session.user.tenantId || "default";

    const { id } = await params;
    await repo.delete(id, tenantId);
    return apiSuccess({ deleted: true, id });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Unauthorized", 401);
  }
}

