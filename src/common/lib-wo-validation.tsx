import { ReactNode, useCallback, useState } from 'react';

type FormState<T_FormValues> = Record<keyof T_FormValues, boolean>;

type Control<T_FormValues extends Record<string, any>> = ReturnType<
  typeof useForm<T_FormValues>
>['control'];

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
 * @param transform (Optional) Function to transform UI component's onChange arguments for value of form. \
 * Must have no side-effects and depend only on arguments. The content of this function must not change. \
 * i.e. `(e: ChangeEvent<HTMLInputElement>) => e.target.value`
 * @returns
 */
export const Controller = <
  T_FormValues extends Record<string, any>,
  T_Name extends Extract<keyof T_FormValues, string>,
  T_Transform extends ((value: any) => T_FormValues[T_Name]) | undefined,
  T_OnChangeFn extends (value: any) => void = undefined extends T_Transform
    ? (value: T_FormValues[T_Name]) => void
    : (value: Parameters<NonNullable<T_Transform>>[0]) => void
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
  transform,
  render,
}: {
  control: Control<T_FormValues>;
  name: T_Name;
  transform?: T_Transform;
  render: (props: {
    name: T_Name;
    value: T_FormValues[T_Name];
    isChanged: boolean;
    isBlurred: boolean;
    onChange: T_OnChangeFn;
    onBlur: () => void;
  }) => ReactNode;
}) => {
  const createOnChangeField = <
    T_Name extends keyof T_FormValues,
    T_Transform extends ((value: any) => T_FormValues[T_Name]) | undefined
  >(
    name: T_Name,
    transform?: T_Transform
  ) => {
    return ((value: any) => {
      const newValue = transform == null ? value : transform(value);
      setValues((prev) => {
        return { ...prev, [name]: newValue };
      });
      setFieldsChanged((prev) => {
        return { ...prev, [name]: true };
      });
    }) as T_OnChangeFn;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(createOnChangeField(name, transform), [
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
