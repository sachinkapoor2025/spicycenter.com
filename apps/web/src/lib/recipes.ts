import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type Recipe = {
  slug: string;
  title: string;
  summary: string;
  cuisine: string;
  spiceIds: string[];
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients?: string[];
  steps?: string[];
  region?: string;
  course?: string;
};

function resolveRecipesPath(): string | null {
  const cwd = process.cwd();
  const candidates = ["data/recipes.json", "../../data/recipes.json", "../data/recipes.json"].flatMap((rel) => [
    join(cwd, rel),
    join(cwd, "..", rel),
    join(cwd, "../..", rel),
  ]);
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function loadRecipes(): Recipe[] {
  const path = resolveRecipesPath();
  if (!path) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as Recipe[];
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return loadRecipes().find((r) => r.slug === slug);
}

export function recipesForSpice(spiceId: string): Recipe[] {
  return loadRecipes().filter((r) => r.spiceIds.includes(spiceId));
}
