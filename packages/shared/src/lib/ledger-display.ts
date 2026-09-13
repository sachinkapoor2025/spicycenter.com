/** Display name from email local-part, e.g. order@spicycorner.com → "Order". */
export function displayNameFromEmail(email?: string | null): string {
  const local = (email ?? "").trim().split("@")[0] ?? "";
  if (!local) return "Someone";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function recordedByLabel(email?: string | null, noun: "settlement" | "expense" = "settlement"): string {
  const name = displayNameFromEmail(email);
  if (noun === "expense") return `${name} logged this expense`;
  return `${name} recorded this settlement`;
}
