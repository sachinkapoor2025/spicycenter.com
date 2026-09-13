import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  blogImageConfigSchema,
  chatConfigSchema,
  configKeys,
  DEFAULT_CHAT_CONFIG,
  defaultPaymentConfig,
  paymentConfigSchema,
} from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, now } from "../lib/db";
import { ok, badRequest, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";
import { getLiveUsdInrRate, getLiveUsdRates } from "../lib/exchange-rate";

export async function getUsdInrRate(_event: APIGatewayProxyEventV2) {
  const quote = await getLiveUsdInrRate();
  return ok(quote);
}

export async function getFxRates(_event: APIGatewayProxyEventV2) {
  const quote = await getLiveUsdRates();
  return ok({ base: "USD", ...quote });
}

export async function getPaymentConfig(_event: APIGatewayProxyEventV2) {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.payments.pk, SK: configKeys.payments.sk },
    })
  );

  const config = result.Item ?? defaultPaymentConfig;
  return ok({ config });
}

export async function updatePaymentConfig(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = paymentConfigSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.payments.pk,
        SK: configKeys.payments.sk,
        ...parsed.data,
        updatedAt: now(),
      },
    })
  );

  return ok({ config: parsed.data });
}

export async function getBlogImages(_event: APIGatewayProxyEventV2) {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.blogImages.pk, SK: configKeys.blogImages.sk },
    })
  );

  const parsed = blogImageConfigSchema.safeParse(result.Item ?? { images: {} });
  return ok({ images: parsed.success ? parsed.data.images : {} });
}

export async function getChatConfig(_event: APIGatewayProxyEventV2) {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.chat.pk, SK: configKeys.chat.sk },
    })
  );
  const parsed = chatConfigSchema.safeParse(result.Item ?? {});
  return ok({ config: parsed.success ? parsed.data : DEFAULT_CHAT_CONFIG });
}

export async function updateChatConfig(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = chatConfigSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.chat.pk,
        SK: configKeys.chat.sk,
        ...parsed.data,
        updatedAt: now(),
      },
    })
  );

  return ok({ config: parsed.data });
}

export async function updateBlogImages(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = blogImageConfigSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.blogImages.pk,
        SK: configKeys.blogImages.sk,
        images: parsed.data.images,
        updatedAt: now(),
      },
    })
  );

  return ok({ images: parsed.data.images });
}
