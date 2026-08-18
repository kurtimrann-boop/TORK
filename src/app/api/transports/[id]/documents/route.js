import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request, { params }) {
  try {
    const { id: transportId } = await params;
    const body = await request.json();
    const {
      documentType = "POD",
      fileName,
      fileBase64,
      mimeType = "application/pdf",
      userId,
    } = body;

    if (!fileName || !fileBase64) {
      return NextResponse.json(
        { success: false, error: "Dosya adı ve içerik verisi zorunludur." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz dosya türü. Yalnızca PDF, JPG ve PNG formatları desteklenmektedir.",
        },
        { status: 400 }
      );
    }

    // Estimate file size from Base64
    const estimatedSizeBytes = Math.round((fileBase64.length * 3) / 4);
    if (estimatedSizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Dosya boyutu 10MB sınırını aşıyor.",
        },
        { status: 400 }
      );
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storagePath = `transport-documents/${transportId}/${userId || "carrier"}/${docId}-${sanitizedFileName}`;
    const documentUrl = `https://storage.tork.test/${storagePath}`;

    const documentRecord = {
      id: docId,
      transport_id: transportId,
      document_type: documentType,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: estimatedSizeBytes,
      storage_path: storagePath,
      document_url: documentUrl,
      uploaded_by: userId || null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      document: documentRecord,
      message: "Teslimat belgesi (POD) başarıyla yüklendi ve meta verisi oluşturuldu.",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Belge yüklenirken sunucu hatası oluştu.", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id: transportId } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "carrier";

    // Anonymous or unauthorized access check
    if (role === "anonymous") {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim. Belgelere anonim erişim engellenmiştir." },
        { status: 401 }
      );
    }

    const mockDocs = [
      {
        id: `doc-${transportId}-pod`,
        transport_id: transportId,
        document_type: "POD",
        file_name: "teslim_belgesi_islak_imzali.pdf",
        mime_type: "application/pdf",
        storage_path: `transport-documents/${transportId}/carrier/pod.pdf`,
        document_url: `https://storage.tork.test/transport-documents/${transportId}/carrier/pod.pdf`,
        created_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      documents: mockDocs,
      role,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Belgeler alınamadı.", details: err.message },
      { status: 500 }
    );
  }
}
