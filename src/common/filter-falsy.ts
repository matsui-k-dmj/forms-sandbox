export function filterFalsy<T>(v: T): v is NonFalsy<T> {
  return Boolean(v);
}
