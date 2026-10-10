
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 50;
const MAX_ITEMS = 50;
const MAX_QUANTITY_PER_ITEM = 20;
const ALLOWED_SIZES = new Set([
  "XS", "S", "M", "L", "XL", "XXL",
]);

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function nonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const catalogueUrl = Deno.env.get("CATALOGUE_URL");
    const syncSecret = Deno.env.get("ORDER_SYNC_SECRET");
    const syncUrl = Deno.env.get("ORDER_SYNC_URL");

    if (!supabaseUrl || !serviceKey || !catalogueUrl) {
      console.error("Required server configuration is missing.");
      return respond({ error: "Server configuration incomplete" }, 500);
    }

    // Only use the configured, trusted catalogue endpoint.
    let parsedCatalogueUrl: URL;
    try {
      parsedCatalogueUrl = new URL(catalogueUrl);
    } catch {
      return respond({ error: "Invalid catalogue configuration" }, 500);
    }

    if (parsedCatalogueUrl.protocol !== "https:") {
      return respond({ error: "Invalid catalogue configuration" }, 500);
    }

    if (!req.headers.get("content-type")?.includes("application/json")) {
      return respond({ error: "Expected JSON request" }, 415);
    }

    const body = await req.json();
    const c = body?.customer;
    const requestedItems = body?.items;

    if (
      !c ||
      !nonEmptyString(c.name, 120) ||
      !nonEmptyString(c.mobile, 20) ||
      !nonEmptyString(c.address, 500) ||
      !nonEmptyString(c.city, 100) ||
      !nonEmptyString(c.state, 100) ||
      !nonEmptyString(c.pincode, 10) ||
      (c.email != null &&
        (typeof c.email !== "string" || c.email.length > 254)) ||
      !Array.isArray(requestedItems) ||
      requestedItems.length === 0 ||
      requestedItems.length > MAX_ITEMS
    ) {
      return respond({ error: "Invalid order details" }, 400);
    }

    // India PIN code format.
    if (!/^[1-9]\d{5}$/.test(c.pincode.trim())) {
      return respond({ error: "Invalid PIN code" }, 400);
    }

    // Basic phone-number validation; normalize country prefixes on the UI
    // if your checkout supports additional countries.
    if (!/^[+]?[\d\s()-]{7,20}$/.test(c.mobile.trim())) {
      return respond({ error: "Invalid mobile number" }, 400);
    }

    if (
      body.payment_method != null &&
      body.payment_method !== "COD"
    ) {
      return respond({ error: "Only COD is currently available" }, 400);
    }

    // Validate the requested fields. Client-supplied names and prices
    // are intentionally ignored when building the final order.
    for (const item of requestedItems) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.product_id !== "string" ||
        item.product_id.trim().length === 0 ||
        item.product_id.length > 100 ||
        typeof item.size !== "string" ||
        !ALLOWED_SIZES.has(item.size) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_QUANTITY_PER_ITEM
      ) {
        return respond({ error: "Invalid order items" }, 400);
      }
    }

    // Fetch the current catalogue from the configured server-side endpoint.
    let catalogueResponse: Response;
    try {
      catalogueResponse = await fetch(catalogueUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
    } catch {
      console.error("Catalogue fetch failed.");
      return respond({ error: "Catalogue temporarily unavailable" }, 503);
    }

    if (!catalogueResponse.ok) {
      console.error("Catalogue returned HTTP", catalogueResponse.status);
      return respond({ error: "Catalogue temporarily unavailable" }, 503);
    }

    let catalogue: any;
    try {
      catalogue = await catalogueResponse.json();
    } catch {
      return respond({ error: "Catalogue response is invalid" }, 503);
    }

    if (!catalogue || !Array.isArray(catalogue.products)) {
      return respond({ error: "Catalogue response is invalid" }, 503);
    }

    // Reject duplicate IDs or malformed entries rather than guessing
    // which price should be used.
    const productsById = new Map<string, any>();

    for (const product of catalogue.products) {
      if (
        !product ||
        typeof product.id !== "string" ||
        typeof product.name !== "string" ||
        !Number.isSafeInteger(product.price) ||
        product.price < 0 ||
        !Array.isArray(product.sizes) ||
        typeof product.active !== "boolean"
      ) {
        return respond({ error: "Catalogue contains invalid product data" }, 503);
      }

      if (productsById.has(product.id)) {
        return respond({ error: "Catalogue contains duplicate product IDs" }, 503);
      }

      productsById.set(product.id, product);
    }

    // Build trusted order items and calculate the subtotal in integer rupees.
    const verifiedItems = [];
    let subtotal = 0;

    for (const requested of requestedItems) {
      const product = productsById.get(requested.product_id.trim());

      if (!product || product.active !== true) {
        return respond({
          error: "A selected product is unavailable. Refresh the catalogue.",
        }, 400);
      }

      if (!product.sizes.includes(requested.size)) {
        return respond({
          error: `Size ${requested.size} is unavailable for ${product.name}`,
        }, 400);
      }

      const lineTotal = product.price * requested.quantity;

      if (!Number.isSafeInteger(lineTotal)) {
        return respond({ error: "Order amount is too large" }, 400);
      }

      subtotal += lineTotal;

      if (!Number.isSafeInteger(subtotal)) {
        return respond({ error: "Order amount is too large" }, 400);
      }

      verifiedItems.push({
        product_id: product.id,
        name: product.name,
        size: requested.size,
        quantity: requested.quantity,
        unit_price: product.price,
        line_total: lineTotal,
      });
    }

    // Shipping is calculated exclusively from the verified subtotal.
    const shipping =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;

    if (!Number.isSafeInteger(total)) {
      return respond({ error: "Order amount is too large" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const orderNumber =
      "HS-" +
      new Date().toISOString().replace(/\D/g, "").slice(0, 14) +
      "-" +
      crypto.randomUUID().slice(0, 8).toUpperCase();

    const order = {
      order_number: orderNumber,
      customer_name: c.name.trim(),
      mobile: c.mobile.trim(),
      email: typeof c.email === "string" ? c.email.trim() || null : null,
      address: c.address.trim(),
      city: c.city.trim(),
      state: c.state.trim(),
      pincode: c.pincode.trim(),
      items: verifiedItems,
      subtotal,
      shipping_charge: shipping,
      total_amount: total,
      payment_method: "COD",
      payment_status: "PENDING",
      order_status: "PENDING_CONFIRMATION",
      source: "WEBSITE",
    };

    const { error: insertError } = await supabase
      .from("orders")
      .insert(order);

    if (insertError) {
      console.error("Order insert failed:", insertError.message);
      return respond({ error: "Could not save order" }, 500);
    }

    let sheetSynced = false;

    if (syncUrl && syncSecret) {
      try {
        const syncResponse = await fetch(syncUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: syncSecret,
            order,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (syncResponse.ok) {
          const result = await syncResponse.json();
          sheetSynced = result?.success === true;
        } else {
          console.error("Order saved, but Sheets sync returned an error.");
        }
      } catch {
        console.error("Order saved, but Sheets sync failed.");
      }
    }

    return respond({
      success: true,
      order_number: orderNumber,
      saved_to_supabase: true,
      synced_to_sheet: sheetSynced,
      subtotal,
      shipping_charge: shipping,
      total_amount: total,
      message: "Order saved",
    }, 201);
  } catch (error) {
    console.error("Order request failed:", error);
    return respond({ error: "Invalid request" }, 400);
  }
});
