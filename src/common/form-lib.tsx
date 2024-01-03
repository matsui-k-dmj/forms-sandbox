import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';

export type FormErrors<T_FormValues extends Record<string, any>> = Record<
  keyof T_FormValues,
  string[]
>;

export type Form<T_FormValues extends Record<string, any>> = {
  values: T_FormValues;
  errors: FormErrors<T_FormValues>;
  isDirty: boolean;
};

export type Validators<T_FormValues extends Record<string, any>> = Partial<
  Record<keyof T_FormValues, (formValues: T_FormValues) => string[]>
>;

export function useForm<T_FormValues extends Record<string, any>>({
  initialValues: initialData,
  validators,
  validatorsDeps,
}: {
  initialValues: T_FormValues;
  validators: Validators<T_FormValues>;
  validatorsDeps: any[];
}) {
  type _Form = Form<T_FormValues>;
  type _FormErrors = FormErrors<T_FormValues>;
  const [form, setForm] = useState<_Form>({
    values: initialData,
    errors: Object.fromEntries(
      Object.keys(initialData).map((key) => [key, [] as string[]])
    ) as _FormErrors,
    isDirty: false,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _validators = useMemo(() => validators, validatorsDeps);

  /** validator がない場合は [] を返す */
  const validateTarget = useCallback(
    function validateTarget(
      target: keyof T_FormValues,
      formValues: T_FormValues
    ): string[] {
      return _validators[target]?.(formValues) ?? [];
    },
    [_validators]
  );

  /** 指定したフィールドだけバリデーションする */
  const updateErrors = useCallback(
    function updateErrors(
      formValues: T_FormValues,
      prevErrors: _FormErrors,
      validateTargetArray: Array<keyof T_FormValues>
    ): _FormErrors {
      const newErrors = Object.fromEntries(
        validateTargetArray.map((target) => {
          return [target, validateTarget(target, formValues)];
        })
      );
      return { ...prevErrors, ...newErrors };
    },
    [validateTarget]
  );

  /** フォーム全体のバリデーション */
  const validateAllFields = useCallback(
    function validateAllFields(formValues: T_FormValues): _FormErrors {
      const newErrors = Object.fromEntries(
        Object.keys(formValues).map((key) => [
          key,
          validateTarget(key as keyof T_FormValues, formValues),
        ])
      );

      return newErrors as _FormErrors;
    },
    [validateTarget]
  );

  function wrapSubmit(
    submitFn: (formValues: T_FormValues) => void,
    errorFn: (form: _FormErrors) => void
  ) {
    return () => {
      setForm((prev) => {
        const newErrors = validateAllFields(prev.values);
        if (Object.values(newErrors).some((errors) => errors.length > 0)) {
          errorFn(newErrors);
          return { ...prev, errors: newErrors };
        }

        submitFn(prev.values);
        return { ...prev, errors: newErrors, isDirty: false };
      });
    };
  }

  return {
    form,
    setForm,
    wrapSubmit,
    validators: _validators,
    control: {
      form,
      setForm,
      updateErrors,
    },
    utils: {
      validateTarget,
      updateErrors,
    },
  };
}

export const Controller = <
  T_FormValues extends Record<string, any>,
  T_UpdateTarget extends keyof T_FormValues,
  T_ConvertFn extends
    | ((value: any) => T_FormValues[T_UpdateTarget])
    | undefined,
  R extends (value: any) => void = undefined extends T_ConvertFn
    ? (value: T_FormValues[T_UpdateTarget]) => void
    : (value: Parameters<NonNullable<T_ConvertFn>>[0]) => void
>({
  control,
  updateTarget,
  validateTargetArray,
  convertFn,
  render,
}: {
  control: {
    form: Form<T_FormValues>;
    setForm: Dispatch<SetStateAction<Form<T_FormValues>>>;
    updateErrors: (
      formValues: T_FormValues,
      prevErrors: FormErrors<T_FormValues>,
      validateTargetArray: Array<keyof T_FormValues>
    ) => FormErrors<T_FormValues>;
  };
  updateTarget: T_UpdateTarget;
  validateTargetArray: Array<keyof T_FormValues>;
  convertFn?: T_ConvertFn;
  render: ({
    value,
    error,
    onChange,
  }: {
    value: T_FormValues[T_UpdateTarget];
    error: FormErrors<T_FormValues>[T_UpdateTarget];
    onChange: R;
  }) => ReactNode;
}) => {
  const { setForm, updateErrors } = control;
  /**
   * UIコンポーネントの onChange に渡す関数のファクトリー
   * @param updateTarget 更新するフィールド名
   * @param validateTargetArray バリデーションするフィールド名の配列
   * @param convertFn (Optional) UIコンポーネントの onChange の引数を formValues 用に変換する
   * @returns UIコンポーネントの onChange に渡す関数
   */
  const createOnChangeField = useCallback(
    <
      T_UpdateTarget extends keyof T_FormValues,
      T_ConvertFn extends
        | ((value: any) => T_FormValues[T_UpdateTarget])
        | undefined
    >(
      updateTarget: T_UpdateTarget,
      validateTargetArray: Array<keyof T_FormValues>,
      convertFn?: T_ConvertFn
    ) => {
      return ((value: any) => {
        const newValue = convertFn == null ? value : convertFn(value);
        setForm(({ values, errors }) => {
          const newValues = { ...values, [updateTarget]: newValue };
          return {
            values: newValues,
            errors: updateErrors(newValues, errors, validateTargetArray),
            isDirty: true,
          };
        });
      }) as R;
    },
    [setForm, updateErrors]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(
    createOnChangeField(updateTarget, validateTargetArray, convertFn),
    []
  );
  return (
    <>
      {render({
        value: control.form.values[updateTarget],
        error: control.form.errors[updateTarget],
        onChange,
      })}
    </>
  );
};
