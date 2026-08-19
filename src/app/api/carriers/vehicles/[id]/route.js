import { NextResponse } from "next/server";
import { validateVehiclePayload } from "@/utils/vehicleService";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

/**
 * PUT /api/carriers/vehicles/[id]
 * Updates carrier vehicle with IDOR ownership validation.
 */
export async function PUT(request, { params }) {
  const requestId = generateCorrelationId("veh-update");
  const { id } = await params;

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

    if (supabase) {
      const { data: existingVehicle } = await supabase
        .from("carrier_vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (existingVehicle && existingVehicle.carrier_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Bu araç kaydını düzenleme yetkiniz bulunmamaktadır." },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const val = validateVehiclePayload(body);
    if (!val.valid) {
      return NextResponse.json(
        { success: false, error: val.error },
        { status: 422 }
      );
    }

    const updatePayload = {
      plate_number: val.vehicle.plateNumber,
      vehicle_type: val.vehicle.vehicleType,
      brand: val.vehicle.brand,
      model: val.vehicle.model,
      model_year: val.vehicle.modelYear,
      capacity_tons: val.vehicle.capacityTons,
      trailer_type: val.vehicle.trailerType,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      await supabase
        .from("carrier_vehicles")
        .update(updatePayload)
        .eq("id", id)
        .eq("carrier_id", user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Araç bilgileri güncellendi.",
      vehicle: { id, ...updatePayload },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Güncelleme başarısız." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/carriers/vehicles/[id]
 * Deletes carrier vehicle with IDOR ownership validation.
 */
export async function DELETE(request, { params }) {
  const requestId = generateCorrelationId("veh-del");
  const { id } = await params;

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

    if (supabase) {
      const { data: existingVehicle } = await supabase
        .from("carrier_vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (existingVehicle && existingVehicle.carrier_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Bu araç kaydını silme yetkiniz bulunmamaktadır." },
          { status: 403 }
        );
      }

      await supabase
        .from("carrier_vehicles")
        .delete()
        .eq("id", id)
        .eq("carrier_id", user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Araç kaydı silindi.",
      id,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Silme işlemi başarısız." },
      { status: 500 }
    );
  }
}
