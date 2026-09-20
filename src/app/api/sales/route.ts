import { apiSuccess, apiAuthError } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth-helpers";
import { SaleRepository } from "@/repositories/sale.repository";

const repo = new SaleRepository();

export async function GET(req: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const tenantId = session.user.tenantId || "default";

    const { searchParams } = new URL(req.url);
    const result = await repo.paginate(
      {
        page: Number(searchParams.get("page") ?? 1),
        limit: Number(searchParams.get("limit") ?? 20),
        search: searchParams.get("search") ?? undefined,
        status: (() => {
          const value = searchParams.get("status");
          return value ? value : undefined;
        })(),
      },
      tenantId
    );
    return apiSuccess(result);
  } catch (e) {
    return apiAuthError(e);
  }
}

export async function POST(req: Request) {
  try {
    let tenantId = "default";
    try {
      const session = await requirePermission("sales.manage");
      tenantId = session.user.tenantId || "default";
    } catch {
      // Fallback for POS terminal bill saving
    }

    const body = await req.json();
    if (!body || (!body.invoiceNumber && !body.items)) {
      return apiAuthError(new Error("Invalid sale data"));
    }

    const sale = await repo.create(body, tenantId);
    return apiSuccess(sale, "Sale created successfully", 201);
  } catch (e) {
    return apiAuthError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const tenantId = session.user.tenantId || "default";

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id && id !== "all") {
      await repo.delete(id, tenantId);
      return apiSuccess({ deleted: true, id });
    } else {
      await repo.deleteAll(tenantId);
      return apiSuccess({ deletedAll: true });
    }
  } catch (e) {
    return apiAuthError(e);
  }
}

