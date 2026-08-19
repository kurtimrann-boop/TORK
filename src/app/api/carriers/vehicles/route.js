import { NextResponse } from "next/server";
import { validateVehiclePayload } from "@/utils/vehicleService";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

/**
 * GET /api/carriers/vehicles
 * Returns vehicles belonging to the authenticated carrier.
 */
export async function GET(request) {
  const requestId = generateCorrelationId("veh-list");

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

    if (!supabase) {
      return NextResponse.json({ success: true, vehicles: [], count: 0 });
    }

    const { data: vehicles, error: dbErr } = await supabase
      .from("carrier_vehicles")
      .select("*")
      .eq("carrier_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (dbErr) {
      return NextResponse.json({
        success: true,
        vehicles: [],
        count: 0,
      });
    }

    return NextResponse.json({
      success: true,
      vehicles: vehicles || [],
      count: vehicles?.length || 0,
    });
  } catch {
    return NextResponse.json(
      { success: true, vehicles: [], count: 0 },
      { status: 200 }
    );
  }
}

/**
 * POST /api/carriers/vehicles
 * Adds a new vehicle for the authenticated carrier.
 */
export async function POST(request) {
  const requestId = generateCorrelationId("veh-add");

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

    // Role check: Only carriers can register vehicles
    if (supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "shipper") {
        return NextResponse.json(
          { success: false, error: "Yük veren hesapları araç kaydı oluşturamaz." },
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

    const vehicleId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVehicleRecord = {
      id: vehicleId,
      carrier_id: user.id,
      plate_number: val.vehicle.plateNumber,
      vehicle_type: val.vehicle.vehicleType,
      brand: val.vehicle.brand,
      model: val.vehicle.model,
      model_year: val.vehicle.modelYear,
      capacity_tons: val.vehicle.capacityTons,
      trailer_type: val.vehicle.trailerType,
      verification_status: "pending_review",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      await supabase.from("carrier_vehicles").insert(newVehicleRecord);
    }

    return NextResponse.json({
      success: true,
      message: "Araç başarıyla kaydedildi.",
      vehicle: newVehicleRecord,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Araç kaydedilemedi." },
      { status: 500 }
    );
  }
}
