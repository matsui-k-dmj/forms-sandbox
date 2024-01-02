import { Falsy } from './type-utils';

export function filterFalsy<T>(v: T): v is Exclude<T, Falsy> {
  return Boolean(v);
}
