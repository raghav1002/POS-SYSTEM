import { NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/product.repository";

const repo = new ProductRepository();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const barcode = searchParams.get("barcode") || undefined;
    const limit = Number(searchParams.get("limit") || 50);

    // 1. Direct Barcode Lookup (for public home page scanner)
    if (barcode) {
      const p = await repo.findByBarcode(barcode, "default");
      if (p && p.isActive !== false) {
        return NextResponse.json({
          success: true,
          data: [
            {
              _id: p._id,
              id: p.id,
              name: p.name,
              description: p.description ?? "",
              sellingPrice: p.sellingPrice,
              stock: p.stock,
              isAvailable: p.stock > 0,
              categoryId: p.categoryId ?? "",
              images: p.images ?? [],
              image: p.image,
              thumbnail: p.thumbnail,
              sku: p.sku,
              barcode: p.barcode ?? "",
            },
          ],
        });
      }
    }

    const result = await repo.paginate(
      {
        page: 1,
        limit,
        search,
      },
      "default"
    );

    // Filter active products and sanitize public fields (remove costPrice, supplier details, internal margins)
    let publicItems = result.items
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        _id: p._id,
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        sellingPrice: p.sellingPrice,
        stock: p.stock,
        isAvailable: p.stock > 0,
        categoryId: p.categoryId ?? "",
        images: p.images ?? [],
        sku: p.sku,
        barcode: p.barcode ?? "",
      }));

    if (category) {
      publicItems = publicItems.filter((p) => p.categoryId === category);
    }

    return NextResponse.json({
      success: true,
      data: publicItems,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load catalog" },
      { status: 500 }
    );
  }
}
