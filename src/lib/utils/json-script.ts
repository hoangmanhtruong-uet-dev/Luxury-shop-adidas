/**
 * Escapes a JSON payload so it is safe to inline inside an HTML <script> element.
 *
 * `JSON.stringify` does not escape `<`, `>` or `&`. A value containing
 * `</script><script>...</script>` therefore terminates the script element early and
 * the remainder is parsed as executable HTML — a stored-XSS vector whenever the
 * payload embeds attacker-controlled text (product name, description, review...).
 *
 * Replacing those three characters with their unicode escapes produces an
 * equivalent JSON document that cannot break out of the tag. `U+2028`/`U+2029`
 * are escaped too because they are literal line terminators in (pre-ES2019) JS.
 */
export function escapeJsonForHtmlScript(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}