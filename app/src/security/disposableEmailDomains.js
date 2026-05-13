// Initial denylist for well-known temporary/disposable email providers.
// Keep this list centralized so future updates can be loaded from DB/config
// without duplicating security policy across routes.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "20minutemail.com",
  "burnermail.io",
  "discard.email",
  "dispostable.com",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "inboxkitten.com",
  "mail-temporaire.fr",
  "mailcatch.com",
  "mailcatch.org",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spamgourmet.com",
  "temp-mail.com",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.net",
  "tempmailaddress.com",
  "tempmailo.com",
  "temporary-mail.net",
  "temporarymail.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "yopmail.co",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.gq",
  "yopmail.net",
  "yopmail.org"
]);

function normalizeDomain(domain) {
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

function isDisposableDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return false;
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(normalized)) {
    return true;
  }

  return Array.from(DISPOSABLE_EMAIL_DOMAINS).some((blockedDomain) =>
    normalized.endsWith(`.${blockedDomain}`)
  );
}

module.exports = {
  DISPOSABLE_EMAIL_DOMAINS,
  isDisposableDomain,
  normalizeDomain
};
