import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  accountAddressInputSchema,
  accountAddressUpdateSchema,
  accountProfileUpdateSchema,
  accountKeys,
  type AccountAddress,
  type AccountProfile,
} from "@spicycorner/shared";
import { docClient, CUSTOMERS_TABLE, now } from "../lib/db";
import { ok, created, badRequest, unauthorized, notFound } from "../lib/response";
import { getAuth } from "../lib/auth";

type StoredProfile = AccountProfile & { PK: string; SK: string };
type StoredAddress = AccountAddress & { PK: string; SK: string; createdAt: string; updatedAt: string };

async function getProfile(userId: string, email: string): Promise<StoredProfile> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { PK: accountKeys.pk(userId), SK: accountKeys.profileSk() },
    })
  );

  if (result.Item) return result.Item as StoredProfile;

  const timestamp = now();
  const profile: StoredProfile = {
    userId,
    email,
    PK: accountKeys.pk(userId),
    SK: accountKeys.profileSk(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: profile }));
  return profile;
}

async function listAddresses(userId: string): Promise<StoredAddress[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": accountKeys.pk(userId),
        ":prefix": accountKeys.addressSkPrefix(),
      },
    })
  );

  return (result.Items ?? []) as StoredAddress[];
}

function toAddress(item: StoredAddress): AccountAddress {
  return {
    id: item.id,
    label: item.label,
    isDefault: item.isDefault ?? false,
    name: item.name,
    line1: item.line1,
    line2: item.line2,
    city: item.city,
    state: item.state,
    postalCode: item.postalCode,
    country: item.country,
    phone: item.phone,
    email: item.email,
  };
}

async function clearDefaultAddresses(userId: string, addresses: StoredAddress[]) {
  const timestamp = now();
  await Promise.all(
    addresses
      .filter((a) => a.isDefault)
      .map((a) =>
        docClient.send(
          new PutCommand({
            TableName: CUSTOMERS_TABLE,
            Item: { ...a, isDefault: false, updatedAt: timestamp },
          })
        )
      )
  );
}

export async function getAccount(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const profile = await getProfile(auth.userId, auth.email);
  const addressItems = await listAddresses(auth.userId);
  const addresses = addressItems
    .map(toAddress)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  const { PK: _pk, SK: _sk, ...profileData } = profile;
  return ok({ profile: profileData, addresses });
}

export async function updateAccountProfile(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = accountProfileUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const existing = await getProfile(auth.userId, auth.email);
  const timestamp = now();
  const updated: StoredProfile = {
    ...existing,
    ...parsed.data,
    email: auth.email,
    userId: auth.userId,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: updated }));
  const { PK: _pk, SK: _sk, ...profileData } = updated;
  return ok({ profile: profileData });
}

export async function createAccountAddress(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = accountAddressInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const existing = await listAddresses(auth.userId);
  const timestamp = now();
  const addressId = uuidv4();
  const makeDefault = parsed.data.isDefault ?? existing.length === 0;

  if (makeDefault) await clearDefaultAddresses(auth.userId, existing);

  const item: StoredAddress = {
    ...parsed.data,
    id: addressId,
    label: parsed.data.label ?? parsed.data.name,
    isDefault: makeDefault,
    PK: accountKeys.pk(auth.userId),
    SK: accountKeys.addressSk(addressId),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: item }));
  return created({ address: toAddress(item) });
}

export async function updateAccountAddress(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const addressId = event.pathParameters?.addressId;
  if (!addressId) return badRequest("Address ID required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = accountAddressUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const existing = await listAddresses(auth.userId);
  const current = existing.find((a) => a.id === addressId);
  if (!current) return notFound("Address not found");

  const timestamp = now();
  if (parsed.data.isDefault) await clearDefaultAddresses(auth.userId, existing);

  const updated: StoredAddress = {
    ...current,
    ...parsed.data,
    id: addressId,
    isDefault: parsed.data.isDefault ?? current.isDefault,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: updated }));
  return ok({ address: toAddress(updated) });
}

export async function deleteAccountAddress(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const addressId = event.pathParameters?.addressId;
  if (!addressId) return badRequest("Address ID required");

  const existing = await listAddresses(auth.userId);
  const current = existing.find((a) => a.id === addressId);
  if (!current) return notFound("Address not found");

  await docClient.send(
    new DeleteCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { PK: accountKeys.pk(auth.userId), SK: accountKeys.addressSk(addressId) },
    })
  );

  if (current.isDefault) {
    const remaining = existing.filter((a) => a.id !== addressId);
    if (remaining.length > 0) {
      const next = { ...remaining[0], isDefault: true, updatedAt: now() };
      await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: next }));
    }
  }

  return ok({ ok: true });
}
