import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  configKeys,
  defaultShippingSettings,
  shippingSettingsSchema,
  type ShippingSettings,
} from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, now } from "../db";

export async function loadShippingSettings(): Promise<ShippingSettings> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.shipping.pk, SK: configKeys.shipping.sk },
    })
  );

  const parsed = shippingSettingsSchema.safeParse(result.Item ?? defaultShippingSettings);
  return parsed.success ? parsed.data : defaultShippingSettings;
}

export async function saveShippingSettings(settings: ShippingSettings): Promise<ShippingSettings> {
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.shipping.pk,
        SK: configKeys.shipping.sk,
        ...settings,
        updatedAt: now(),
      },
    })
  );
  return settings;
}
