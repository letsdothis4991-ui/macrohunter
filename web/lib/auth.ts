/** A shared password for the whole site, so only people Resh shares it with can use (and spend) it. */
export const AUTH_COOKIE = "mh_auth";

export async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`macrohunter:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
