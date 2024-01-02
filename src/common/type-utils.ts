export type Falsy = false | 0 | '' | null | undefined;

export type NonFalsy<T> = Exclude<T, Falsy>;
