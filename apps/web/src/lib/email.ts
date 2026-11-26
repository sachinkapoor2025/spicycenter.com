export { isStrictEmail } from "@spicycorner/shared";

/** HTML pattern so browsers reject addresses with no dot in the domain. */
export const EMAIL_INPUT_PATTERN = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}";
export const EMAIL_INPUT_TITLE = "Enter a valid email address, including a dot in the domain.";
