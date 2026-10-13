import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  customerKeys,
  leadNotifyStamp,
  type LeadCaptureInput,
  type LeadNotifyStamp,
} from "@spicycorner/shared";
import { docClient, CUSTOMERS_TABLE, now } from "./db";
import { notifyAdminLead, type EmailSendResult } from "./email";

export type LeadPersistItem = LeadCaptureInput & {
  leadId: string;
  createdAt: string;
  updatedAt: string;
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  email?: string;
};

export type LeadPersistDeps = {
  putItem: (item: LeadPersistItem) => Promise<void>;
  updateNotification: (key: { PK: string; SK: string }, stamp: LeadNotifyStamp) => Promise<void>;
  notify: (lead: LeadCaptureInput, refs: { leadId: string; createdAt: string }) => Promise<EmailSendResult>;
};

export function buildLeadItem(input: {
  leadPayload: LeadCaptureInput;
  email?: string;
  timestamp: string;
  leadId: string;
}): LeadPersistItem {
  return {
    ...input.leadPayload,
    ...(input.email ? { email: input.email } : {}),
    leadId: input.leadId,
    PK: customerKeys.pk(input.leadPayload.sessionId),
    SK: customerKeys.leadSk(input.timestamp),
    GSI1PK: customerKeys.gsi1pk(),
    GSI1SK: customerKeys.gsi1sk(input.timestamp),
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
  };
}

export async function persistLeadThenNotify(
  input: {
    leadPayload: LeadCaptureInput;
    email?: string;
    timestamp: string;
    leadId: string;
    notifiedAt?: string;
  },
  deps: LeadPersistDeps
): Promise<{ item: LeadPersistItem; emailResult: EmailSendResult; stamp: LeadNotifyStamp }> {
  const item = buildLeadItem(input);
  await deps.putItem(item);

  let emailResult: EmailSendResult;
  try {
    emailResult = await deps.notify(input.leadPayload, {
      leadId: input.leadId,
      createdAt: input.timestamp,
    });
  } catch (err) {
    emailResult = {
      ok: false,
      error: err instanceof Error ? err.message : "Notification failed",
    };
  }

  const stamp = leadNotifyStamp(emailResult, input.notifiedAt ?? input.timestamp);
  await deps.updateNotification({ PK: item.PK, SK: item.SK }, stamp);
  return { item, emailResult, stamp };
}

export async function putLeadItem(item: LeadPersistItem): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: CUSTOMERS_TABLE,
      Item: item,
    })
  );
}

export async function stampLeadNotification(
  key: { PK: string; SK: string },
  stamp: LeadNotifyStamp
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { PK: key.PK, SK: key.SK },
      UpdateExpression: stamp.notifyEmailError
        ? "SET notifyEmailStatus = :s, notifyEmailAt = :t, notifyEmailError = :e, updatedAt = :t REMOVE notifyEmailRetryLockAt"
        : "SET notifyEmailStatus = :s, notifyEmailAt = :t, updatedAt = :t REMOVE notifyEmailError, notifyEmailRetryLockAt",
      ExpressionAttributeValues: {
        ":s": stamp.notifyEmailStatus,
        ":t": stamp.notifyEmailAt,
        ...(stamp.notifyEmailError ? { ":e": stamp.notifyEmailError } : {}),
      },
    })
  );
}

export async function persistCapturedLead(input: {
  leadPayload: LeadCaptureInput;
  email?: string;
  timestamp: string;
  leadId: string;
}): Promise<{ item: LeadPersistItem; emailResult: EmailSendResult; stamp: LeadNotifyStamp }> {
  return persistLeadThenNotify({ ...input, notifiedAt: now() }, {
    putItem: putLeadItem,
    updateNotification: stampLeadNotification,
    notify: notifyAdminLead,
  });
}
