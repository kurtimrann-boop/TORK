import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateAvatarMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) return false;
  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  // WEBP: 'RIFF' at 0 and 'WEBP' at 8
  const isWebp =
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  return isJpeg || isPng || isWebp;
}

export async function POST(request) {
  const requestId = generateCorrelationId("profile-avatar");

  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { user, error: authErr, supabase } = await authenticateServerRequest(token);
    if (authErr || !user) {
      const err = createProductionError({
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        userMessage: authErr || "Geçersiz veya süresi dolmuş oturum.",
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "Lütfen geçerli bir görsel dosyası seçin." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Sadece JPG, PNG veya WEBP formatındaki görseller kabul edilir. (SVG desteklenmez)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Görsel boyutu maksimum 5MB olabilir." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateAvatarMagicBytes(buffer)) {
      return NextResponse.json(
        { success: false, error: "Dosya içeriği geçerli bir JPG, PNG veya WEBP görseli değil." },
        { status: 400 }
      );
    }

    const fileExt = file.type.split("/")[1] || "jpg";
    const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

    let avatarUrl = `https://tork.app/avatars/${fileName}`;

    if (supabase) {
      try {
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("profile-avatars")
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: pubUrlData } = supabase.storage
            .from("profile-avatars")
            .getPublicUrl(fileName);
          if (pubUrlData?.publicUrl) {
            avatarUrl = pubUrlData.publicUrl;
          }
        }
      } catch {
        // Fallback gracefully
      }

      await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Profil fotoğrafı başarıyla güncellendi.",
      avatarUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Profil fotoğrafı yüklenemedi." },
      { status: 500 }
    );
  }
}
