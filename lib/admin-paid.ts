/**
 * Helpers for granting Pro in Supabase outside of Gumroad (e.g. support / testing).
 * The app only trusts `profiles.is_paid_user` from the database — never a client flag.
 */

/** Copy into Supabase SQL Editor; replace the email. */
export function sqlGrantPaidForEmail(email: string): string {
  const safe = email.replace(/'/g, "''");
  return `update public.profiles
set is_paid_user = true
where id = (select id from auth.users where lower(email) = lower('${safe}') limit 1);`;
}
