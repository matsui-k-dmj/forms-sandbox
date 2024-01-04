import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react';

type FormState<T_FormValues> = Record<keyof T_FormValues, boolean>;

/**
 * @param initialValues Initial values for T_FormValues. All fields must be initialized regardless of the optionality.
 */
export function useForm<T_FormValues extends Record<string, any>>({
  initialValues,
}: {
  initialValues: Required<T_FormValues>;
}) {
  const [values, setValues] = useState<T_FormValues>(initialValues);
  const [fieldsChanged, setFieldsChanged] = useState(
    Object.fromEntries(
      Object.keys(initialValues).map((key) => [key, false])
    ) as FormState<T_FormValues>
  );

  const [fieldsBlurred, setFieldBlurred] = useState(
    Object.fromEntries(
      Object.keys(initialValues).map((key) => [key, false])
    ) as FormState<T_FormValues>
  );

  return {
    values,
    setValues,
    fieldsChanged,
    setFieldsChanged,
    fieldsBlurred,
    setFieldBlurred,
    control: {
      values,
      setValues,
      fieldsChanged,
      setFieldsChanged,
      fieldsBlurred,
      setFieldBlurred,
    },
  };
}

/**
 * @param control `control` returned form useForm
 * @param target name of the field to update
 * @param convertFn (Optional) Function to convert UI component's onChange arguments for value of form. \
 * Must have no side-effects and depend only on arguments. The content of this function must not change. \
 * i.e. `(e: ChangeEvent<HTMLInputElement>) => e.target.value`
 * @returns
 */
export const Controller = <
  T_FormValues extends Record<string, any>,
  T_Name extends Extract<keyof T_FormValues, string>,
  T_ConvertFn extends ((value: any) => T_FormValues[T_Name]) | undefined,
  T_OnChangeFn extends (value: any) => void = undefined extends T_ConvertFn
    ? (value: T_FormValues[T_Name]) => void
    : (value: Parameters<NonNullable<T_ConvertFn>>[0]) => void
>({
  control: {
    values,
    setValues,
    fieldsChanged,
    setFieldsChanged,
    fieldsBlurred,
    setFieldBlurred,
  },
  name,
  convert,
  render,
}: {
  control: {
    values: T_FormValues;
    setValues: Dispatch<SetStateAction<T_FormValues>>;
    fieldsChanged: FormState<T_FormValues>;
    setFieldsChanged: Dispatch<SetStateAction<FormState<T_FormValues>>>;
    fieldsBlurred: FormState<T_FormValues>;
    setFieldBlurred: Dispatch<SetStateAction<FormState<T_FormValues>>>;
  };
  name: T_Name;
  convert?: T_ConvertFn;
  render: (props: {
    name: T_Name;
    value: T_FormValues[T_Name];
    isChanged: boolean;
    isBlurred: boolean;
    onChange: T_OnChangeFn;
    onBlur: () => void;
  }) => ReactNode;
}) => {
  useConvertMustNotChange(name, convert);

  const createOnChangeField = <
    T_Name extends keyof T_FormValues,
    T_ConvertFn extends ((value: any) => T_FormValues[T_Name]) | undefined
  >(
    name: T_Name,
    convert?: T_ConvertFn
  ) => {
    return ((value: any) => {
      const newValue = convert == null ? value : convert(value);
      setValues((prev) => {
        return { ...prev, [name]: newValue };
      });
      setFieldsChanged((prev) => {
        return { ...prev, [name]: true };
      });
    }) as T_OnChangeFn;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(createOnChangeField(name, convert), [
    name,
    setValues,
    setFieldsChanged,
  ]);

  const onBlur = useCallback(() => {
    setFieldBlurred((prev) => {
      return { ...prev, [name]: true };
    });
  }, [name, setFieldBlurred]);

  return (
    <>
      {render({
        name,
        value: values[name],
        isChanged: fieldsChanged[name],
        isBlurred: fieldsBlurred[name],
        onChange,
        onBlur,
      })}
    </>
  );
};

function useConvertMustNotChange(name: string, convert: Function | undefined) {
  const prevConvertStringRef = useRef<Function | undefined | null>(null);
  if (prevConvertStringRef.current === null) {
    prevConvertStringRef.current = convert;
    return;
  }

  if (prevConvertStringRef.current === undefined && convert !== undefined) {
    throw Error(`Field ${name}: convert must not change`);
  }

  if (
    prevConvertStringRef.current !== undefined &&
    prevConvertStringRef.current.toString() !== convert?.toString()
  ) {
    throw Error(`Field ${name}: convert must not change.`);
  }
}
