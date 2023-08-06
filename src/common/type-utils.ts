type Falsy = false | 0 | '' | null | undefined;

type NonFalsy<T> = Exclude<T, Falsy>;
