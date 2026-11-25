// Pure — data-model.md › users.username
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
