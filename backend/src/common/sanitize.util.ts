// OWASP CSV/Formula Injection: cualquier valor que empiece con estos
// caracteres es interpretado como fórmula (o invocación DDE) por Excel si el
// dato se exporta/abre más adelante en una hoja de cálculo. Se neutraliza
// anteponiendo una comilla simple para forzar que se trate como texto literal.
// Se aplica tanto a datos que vienen de un Excel importado como a texto
// escrito directamente por un usuario (p. ej. el Listing Builder), ya que
// ambos terminan guardados en la misma tabla y podrían volver a exportarse.
const DANGEROUS_LEADING_CHARS = new Set(['=', '+', '-', '@', '\t', '\r']);

export function sanitizeText(value: string): string {
  if (value.length > 0 && DANGEROUS_LEADING_CHARS.has(value[0])) {
    return `'${value}`;
  }
  return value;
}
