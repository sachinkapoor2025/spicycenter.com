import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { eproloSaveCredentialsSchema, VENDOR_EPROLO } from "@spicycorner/shared";
import { requireAdmin } from "../lib/auth";
import { badGateway, badRequest, forbidden, ok, serverError } from "../lib/response";
import { EproloApiError, getEproloConnectionStatus, saveEproloCredentials } from "../lib/eprolo";

function handleEproloError(err: unknown) {
  if (err instanceof EproloApiError) {
    return badGateway(err.message);
  }
  return serverError(err instanceof Error ? err.message : "Eprolo request failed");
}

export async function getEproloStatus(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const status = await getEproloConnectionStatus();
    return ok(status);
  } catch (err) {
    return handleEproloError(err);
  }
}

export async function saveEproloKey(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const parsed = eproloSaveCredentialsSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    await saveEproloCredentials(parsed.data.openApiKey, parsed.data.openApiSecret);
    const status = await getEproloConnectionStatus();
    return ok({ saved: true, ...status, vendorSlug: VENDOR_EPROLO });
  } catch (err) {
    return handleEproloError(err);
  }
}
