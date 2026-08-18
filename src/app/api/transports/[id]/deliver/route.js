import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { podDocumentUrl, notes } = body;

    const deliveryRecord = {
      transport_id: id,
      status: "delivered",
      delivered_at: new Date().toISOString(),
      has_pod: Boolean(podDocumentUrl),
      pod_document: podDocumentUrl
        ? {
            document_type: "POD",
            document_url: podDocumentUrl,
            uploaded_at: new Date().toISOString(),
          }
        : null,
      notes: notes || null,
    };

    return NextResponse.json({
      success: true,
      delivery: deliveryRecord,
      message: "Taşıma teslim edildi olarak işaretlendi.",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Teslimat durumu güncellenemedi.", details: err.message },
      { status: 500 }
    );
  }
}
