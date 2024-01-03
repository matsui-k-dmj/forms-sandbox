import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';

export type FormErrors<T_FormData extends Record<string, any>> = Record<
  keyof T_FormData,
  string[]
>;

export type Form<T_FormData extends Record<string, any>> = {
  data: T_FormData;
  error: FormErrors<T_FormData>;
  isDirty: boolean;
};

export type Validators<T_FormData extends Record<string, any>> = Partial<
  Record<keyof T_FormData, (formData: T_FormData) => string[]>
>;

export function useForm<T_FormData extends Record<string, any>>({
  initialValues: initialData,
  validators,
  validatorsDeps,
}: {
  initialValues: T_FormData;
  validators: Validators<T_FormData>;
  validatorsDeps: any[];
}) {
  type _Form = Form<T_FormData>;
  type _FormErrors = FormErrors<T_FormData>;
  const [form, setForm] = useState<_Form>({
    data: initialData,
    error: Object.fromEntries(
      Object.keys(initialData).map((key) => [key, [] as string[]])
    ) as _FormErrors,
    isDirty: false,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _validators = useMemo(() => validators, validatorsDeps);

  /** validator がない場合は [] を返す */
  const validateTarget = useCallback(
    function validateTarget(
      target: keyof T_FormData,
      formData: T_FormData
    ): string[] {
      return _validators[target]?.(formData) ?? [];
    },
    [_validators]
  );

  /** 指定したフィールドだけバリデーションする */
  const updateErrors = useCallback(
    function updateErrors(
      formData: T_FormData,
      prevErrors: _FormErrors,
      validateTargetArray: Array<keyof T_FormData>
    ): _FormErrors {
      const newErrors = Object.fromEntries(
        validateTargetArray.map((target) => {
          return [target, validateTarget(target, formData)];
        })
      );
      return { ...prevErrors, ...newErrors };
    },
    [validateTarget]
  );

  /** フォーム全体のバリデーション */
  const validateAllFields = useCallback(
    function validateAllFields(formData: T_FormData): _FormErrors {
      const newErrors = Object.fromEntries(
        Object.keys(formData).map((key) => [
          key,
          validateTarget(key as keyof T_FormData, formData),
        ])
      );

      return newErrors as _FormErrors;
    },
    [validateTarget]
  );

  function wrapSubmit(
    submitFn: (formData: T_FormData) => void,
    errorFn: (form: _FormErrors) => void
  ) {
    return () => {
      setForm((prev) => {
        const newErrors = validateAllFields(prev.data);
        if (Object.values(newErrors).some((errors) => errors.length > 0)) {
          errorFn(newErrors);
          return { ...prev, error: newErrors };
        }

        submitFn(prev.data);
        return { ...prev, error: newErrors, isDirty: false };
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

type CreateOnChangeFieldFn<
  T_FormData,
  T_UpdateTarget extends keyof T_FormData,
  T_ConvertFn extends ((value: any) => T_FormData[T_UpdateTarget]) | undefined,
  R = undefined extends T_ConvertFn
    ? (value: T_FormData[T_UpdateTarget]) => void
    : (value: Parameters<NonNullable<T_ConvertFn>>[0]) => void
> = (
  updateTarget: T_UpdateTarget,
  validateTargetArray: Array<keyof T_FormData>,
  convertFn?: T_ConvertFn
) => R;

export const Controller = <
  T_FormData extends Record<string, any>,
  T_UpdateTarget extends keyof T_FormData,
  T_ConvertFn extends ((value: any) => T_FormData[T_UpdateTarget]) | undefined
>({
  control,
  updateTarget,
  validateTargetArray,
  convertFn,
  render,
}: {
  control: {
    form: Form<T_FormData>;
    setForm: Dispatch<SetStateAction<Form<T_FormData>>>;
    updateErrors: (
      formData: T_FormData,
      prevErrors: FormErrors<T_FormData>,
      validateTargetArray: Array<keyof T_FormData>
    ) => FormErrors<T_FormData>;
  };
  updateTarget: T_UpdateTarget;
  validateTargetArray: Array<keyof T_FormData>;
  convertFn?: T_ConvertFn;
  render: ({
    data,
    error,
    onChange,
  }: {
    data: T_FormData[T_UpdateTarget];
    error: FormErrors<T_FormData>[T_UpdateTarget];
    onChange: ReturnType<
      CreateOnChangeFieldFn<T_FormData, T_UpdateTarget, T_ConvertFn>
    >;
  }) => ReactNode;
}) => {
  const { setForm, updateErrors } = control;
  /**
   * UIコンポーネントの onChange に渡す関数のファクトリー
   * @param updateTarget 更新するフィールド名
   * @param validateTargetArray バリデーションするフィールド名の配列
   * @param convertFn (Optional) UIコンポーネントの onChange の引数を FormData 用に変換する
   * @returns UIコンポーネントの onChange に渡す関数
   */
  const createOnChangeField = useCallback(
    <
      T_UpdateTarget extends keyof T_FormData,
      T_ConvertFn extends
        | ((value: any) => T_FormData[T_UpdateTarget])
        | undefined,
      R = undefined extends T_ConvertFn
        ? (value: T_FormData[T_UpdateTarget]) => void
        : (value: Parameters<NonNullable<T_ConvertFn>>[0]) => void
    >(
      updateTarget: T_UpdateTarget,
      validateTargetArray: Array<keyof T_FormData>,
      convertFn?: T_ConvertFn
    ): R => {
      return ((value: any) => {
        const newValue = convertFn == null ? value : convertFn(value);
        setForm(({ data, error }) => {
          const newData = { ...data, [updateTarget]: newValue };
          return {
            data: newData,
            error: updateErrors(newData, error, validateTargetArray),
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
        data: control.form.data[updateTarget],
        error: control.form.error[updateTarget],
        onChange,
      })}
    </>
  );
};
