/**
 * Product reviews — DynamoDB items under PRODUCT#slug / REVIEW#id.
 * Aggregate lives on product META as ratingAggregate for Product JSON-LD.
 */
import { QueryCommand, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  createProductReviewSchema,
  productKeys,
  reviewKeys,
  type ProductReview,
  type ProductRatingAggregate,
} from "@spicycorner/shared";
import { randomUUID } from "crypto";
import { docClient, PRODUCTS_TABLE, now } from "../lib/db";
import { ok, created, badRequest, forbidden, notFound } from "../lib/response";
import { getAuth } from "../lib/auth";

async function recomputeAggregate(productSlug: string): Promise<ProductRatingAggregate | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: PRODUCTS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": reviewKeys.pk(productSlug),
        ":sk": reviewKeys.skPrefix(),
      },
    })
  );
  const published = (result.Items ?? []).filter((r) => r.published !== false) as ProductReview[];
  if (!published.length) {
    await docClient.send(
      new UpdateCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(productSlug), SK: productKeys.sk() },
        UpdateExpression: "REMOVE ratingAggregate SET updatedAt = :u",
        ExpressionAttributeValues: { ":u": now() },
      })
    );
    return null;
  }
  const sum = published.reduce((s, r) => s + Number(r.rating || 0), 0);
  const aggregate: ProductRatingAggregate = {
    ratingValue: Math.round((sum / published.length) * 10) / 10,
    reviewCount: published.length,
    bestRating: 5,
    worstRating: 1,
  };
  await docClient.send(
    new UpdateCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(productSlug), SK: productKeys.sk() },
      UpdateExpression: "SET ratingAggregate = :a, updatedAt = :u",
      ExpressionAttributeValues: { ":a": aggregate, ":u": now() },
    })
  );
  return aggregate;
}

export async function listProductReviews(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Product slug required");

  const result = await docClient.send(
    new QueryCommand({
      TableName: PRODUCTS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": reviewKeys.pk(slug),
        ":sk": reviewKeys.skPrefix(),
      },
    })
  );

  const reviews = ((result.Items ?? []) as ProductReview[])
    .filter((r) => r.published !== false)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return ok({ reviews });
}

/** Admin-only create (moderation gate). Public submit still goes through /leads until a widget is wired. */
export async function createProductReview(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden("Admin required");

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Product slug required");

  const product = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!product.Item) return notFound("Product not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = createProductReviewSchema.safeParse({ ...body, productSlug: slug });
  if (!parsed.success) return badRequest(parsed.error.message);

  const reviewId = randomUUID();
  const ts = now();
  const item: ProductReview & { PK: string; SK: string; GSI1PK: string; GSI1SK: string } = {
    ...parsed.data,
    productSlug: slug,
    reviewId,
    published: parsed.data.published ?? false,
    createdAt: ts,
    updatedAt: ts,
    PK: reviewKeys.pk(slug),
    SK: reviewKeys.sk(reviewId),
    GSI1PK: reviewKeys.gsi1pk(),
    GSI1SK: reviewKeys.gsi1sk(ts, reviewId),
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  if (item.published) await recomputeAggregate(slug);

  return created({ review: item });
}
