import { useCallback, useState } from 'react';

type FormState<T_FormValues> = Record<keyof T_FormValues, boolean>;

export function useForm<T_FormValues extends Record<string, any>>({
  initialValues,
}: {
  initialValues: Required<T_FormValues>;
}) {
  const [values, setValues] = useState<Required<T_FormValues>>(initialValues);
  const [fieldsChanged, setFieldsChanged] = useState(
    Object.fromEntries(
      Object.keys(initialValues).map((key) => [key, false])
    ) as FormState<T_FormValues>
  );

  const update = useCallback(
    <T_Name extends keyof T_FormValues>(
      name: T_Name,
      value: T_FormValues[T_Name]
    ) => {
      setValues((prev) => {
        return { ...prev, name: value };
      });
      setFieldsChanged((prev) => {
        return { ...prev, name: true };
      });
    },
    []
  );

  return {
    values,
    setValues,
    fieldsChanged,
    setFieldsChanged,
    update,
  };
}

// 結局 Controller みたいなのでラップしないと、'title' を書きまくらないとダメになる TT
// <TextInput
//   label="タイトル"
//   withAsterisk
//   error={form.error.title.join(', ')}
//   value={form.data.title}
//   onChange={onChangeTitle}
//   maxLength={titleMaxLength + 1}
// />;
