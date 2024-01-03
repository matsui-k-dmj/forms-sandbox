/**
 * form1 のdata, error, isDirty をまとめて一つのstateにする
 * useCallbackの依存関係が減ってる。
 * 更新時にerror とか isDirtyについて考える必要があるから、忘れにくそう。
 * onPost でも setForm の中でいろいろやれれば, formへの依存がなくなってrerenderしなくて良くなる
 */

import {
  taskTemplatesToSelectData,
  usersToSelectData,
} from '@/common/mintine-select';
import {
  Select,
  TextInput,
  Textarea,
  DateInput,
  Button,
  MultiSelect,
} from '@/lib/mantine';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { filterFalsy } from '@/common/filter-falsy';
import {
  fetchAllUsers,
  fetchConstTaskDetail,
  fetchTaskTemplate,
} from '@/common/stubs';
import { useConfirmBeforeUnload } from '@/common/confirm-before-unload';

// 感想: ローカルのフォームの型は optional じゃなくて null のほうが明示的に初期化する必要があるから分かりやすい
type FormData = {
  title: string;
  description: string;
  userIdAssingnedTo: string | null;
  userIdVerifiedBy: string | null;
  userIdInvolvedArray: string[];
  startDate: Date | null;
  endDate: Date | null;
  endCondition: string;
};

type FormErrors = Record<keyof FormData, string[]>;

const titleMaxLength = 8;
const descriptionMaxLength = 20;

export default function Form2() {
  const [form, setForm] = useState<{
    data: FormData;
    error: FormErrors;
    isDirty: boolean;
  }>({
    data: {
      title: '',
      description: '',
      userIdAssingnedTo: null,
      userIdVerifiedBy: null,
      userIdInvolvedArray: [],
      startDate: null,
      endDate: null,
      endCondition: '',
    },
    error: {
      title: [],
      description: [],
      userIdAssingnedTo: [],
      userIdVerifiedBy: [],
      userIdInvolvedArray: [],
      startDate: [],
      endDate: [],
      endCondition: [],
    },
    isDirty: false,
  });

  /**
   * UIコンポーネントの onChange に渡す関数のファクトリー
   * @param updateTarget 更新するフィールド名
   * @param validateTargetArray バリデーションするフィールド名の配列
   * @param convertFn (Optional) UIコンポーネントの onChange の引数を FormData 用に変換する
   * @returns UIコンポーネントの onChange に渡す関数
   */
  const createOnChangeField = <
    T_UpdateTarget extends keyof FormData,
    T_ConvertFn extends ((value: any) => FormData[T_UpdateTarget]) | undefined,
    R = undefined extends T_ConvertFn
      ? (value: FormData[T_UpdateTarget]) => void
      : (value: Parameters<NonNullable<T_ConvertFn>>[0]) => void
  >(
    updateTarget: T_UpdateTarget,
    validateTargetArray: Array<keyof FormData>,
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
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useConfirmBeforeUnload(form.isDirty);

  // # API Sync
  const queryConstTaskDetail = useQuery({
    queryKey: ['ConstTaskDetail'],
    queryFn: () => {
      return fetchConstTaskDetail;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (queryConstTaskDetail.data == null) return;
    setForm((prev) => ({
      ...prev,
      data: responseToFormData(queryConstTaskDetail.data),
    }));
  }, [queryConstTaskDetail.data]);

  const queryAllUsers = useQuery({
    queryKey: ['AllUsers'],
    queryFn: () => {
      return fetchAllUsers;
    },
  });

  // allUsers がまだ取れてないときはTaskDetailの中身で初期化しとく
  const optionUsers = useMemo(
    () =>
      usersToSelectData(
        queryAllUsers.data ??
          [
            queryConstTaskDetail.data?.user_assingned_to,
            queryConstTaskDetail.data?.user_verified_by,
          ].filter(filterFalsy)
      ),
    [queryAllUsers.data, queryConstTaskDetail.data]
  );

  const queryTaskTemplates = useQuery({
    queryKey: ['TaskTemplates'],
    queryFn: () => {
      return fetchTaskTemplate;
    },
  });

  const optionTaskTemplates = useMemo(
    () => taskTemplatesToSelectData(queryTaskTemplates.data ?? []),
    [queryTaskTemplates.data]
  );

  // # イベントハンドラ
  /** テンプレート選択 */
  const onChangeTemplate = useCallback(
    (value: string | null) => {
      setSelectedTemplateId(value);
      const selectedTemplate = queryTaskTemplates.data?.find(
        (template) => String(template.id) === value
      );
      setForm(({ data, error }) => {
        const newData = {
          ...data,
          title: selectedTemplate?.title ?? '',
          description: selectedTemplate?.description ?? '',
        };
        return {
          data: newData,
          error: {
            ...error,
            title: validateTarget('title', newData, validators),
            description: validateTarget('description', newData, validators),
          },
          isDirty: true,
        };
      });
    },
    [queryTaskTemplates.data]
  );

  // elint は createOnChangeField の中身まで読まないので、useCallback の依存対象が分からない
  /* eslint-disable react-hooks/exhaustive-deps */
  // ## 個々のフォーム
  /** タイトル */
  const onChangeTitle = useCallback(
    createOnChangeField(
      'title',
      ['title'],
      (e: ChangeEvent<HTMLInputElement>) => {
        return e.target.value;
      }
    ),
    []
  );

  /** 説明 */
  const onChangeDescription = useCallback(
    createOnChangeField(
      'description',
      ['description'],
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        return e.target.value;
      }
    ),
    []
  );

  /** 担当者 */
  const onChangeUserIdAssingnedTo = useCallback(
    createOnChangeField('userIdAssingnedTo', [
      'userIdAssingnedTo',
      'userIdVerifiedBy',
    ]),
    []
  );

  /** 承認者 */
  const onChangeUserIdVerifiedBy = useCallback(
    createOnChangeField('userIdVerifiedBy', [
      'userIdAssingnedTo',
      'userIdVerifiedBy',
    ]),
    []
  );

  /** 関係者 */
  const onChangeUserIdInvolvedArray = useCallback(
    createOnChangeField('userIdInvolvedArray', ['userIdInvolvedArray']),
    []
  );

  /** 開始日 */
  const onChangeStartDate = useCallback(
    createOnChangeField('startDate', ['startDate', 'endDate']),
    []
  );

  /** 終了日 */
  const onChangeEndDate = useCallback(
    createOnChangeField('endDate', ['startDate', 'endDate', 'endCondition']),
    []
  );

  /** 終了条件 */
  const onChangeEndCondition = useCallback(
    createOnChangeField(
      'endCondition',
      ['endCondition'],
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        return e.currentTarget.value;
      }
    ),
    []
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  /** 保存 */
  const onPost = useCallback(() => {
    setForm((prev) => {
      const newErrors = validateAllFields(prev.data);
      if (Object.values(newErrors).some((errors) => errors.length > 0)) {
        alert(`Errors:\n${JSON.stringify(newErrors, null, 2)}`);
        return { ...prev, error: newErrors };
      }

      const payload = formDataToPayload(prev.data);
      alert(`Submit:\n${JSON.stringify(payload, null, 2)}`);
      return { ...prev, error: newErrors, isDirty: false };
    });
  }, []);

  return (
    <div className="p-20">
      <div className="my-2">タスク編集</div>
      {queryConstTaskDetail.isLoading ||
      queryAllUsers.isLoading ||
      queryTaskTemplates.isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="my-2">
            <Select
              label="テンプレートを選択する"
              data={optionTaskTemplates}
              searchable
              clearable
              nothingFound="No options"
              value={selectedTemplateId}
              onChange={onChangeTemplate}
            />
          </div>
          <div className="my-2">
            <TextInput
              label="タイトル"
              withAsterisk
              error={form.error.title.join(', ')}
              value={form.data.title}
              onChange={onChangeTitle}
              maxLength={titleMaxLength + 1}
            />
          </div>
          <div className="my-2">
            <Textarea
              label="説明"
              value={form.data.description}
              onChange={onChangeDescription}
              maxLength={descriptionMaxLength + 1}
              error={form.error.description.join(', ')}
            />
          </div>
          <div className="my-2">
            <Select
              label="担当者"
              data={optionUsers}
              searchable
              clearable
              nothingFound="No options"
              value={form.data.userIdAssingnedTo}
              onChange={onChangeUserIdAssingnedTo}
              error={form.error.userIdAssingnedTo.join(', ')}
            />
          </div>

          <div className="my-2">
            <Select
              label="承認者"
              data={optionUsers}
              searchable
              clearable
              nothingFound="No options"
              value={form.data.userIdVerifiedBy}
              onChange={onChangeUserIdVerifiedBy}
              error={form.error.userIdVerifiedBy.join(', ')}
            />
          </div>
          <div className="my-2">
            <MultiSelect
              label="関係者"
              data={optionUsers}
              searchable
              clearable
              nothingFound="No options"
              value={form.data.userIdInvolvedArray}
              onChange={onChangeUserIdInvolvedArray}
              error={form.error.userIdInvolvedArray.join(', ')}
            />
          </div>
          <div className="my-2">
            <DateInput
              label="開始日"
              valueFormat="YYYY/MM/DD"
              clearable
              value={form.data.startDate}
              maxDate={form.data.endDate ?? undefined}
              onChange={onChangeStartDate}
              error={form.error.startDate.join(', ')}
            />
          </div>
          <div className="my-2">
            <DateInput
              label="終了日"
              valueFormat="YYYY/MM/DD"
              clearable
              value={form.data.endDate}
              minDate={form.data.startDate ?? undefined}
              onChange={onChangeEndDate}
              error={form.error.endDate.join(', ')}
            />
          </div>
          {form.data.endDate == null && (
            <div className="my-2">
              <Textarea
                label="終了条件"
                value={form.data.endCondition}
                onChange={onChangeEndCondition}
                error={form.error.endCondition.join(', ')}
                withAsterisk={form.data.endDate == null}
              />
            </div>
          )}
          <div>
            <Button onClick={onPost}>保存</Button>
          </div>
        </>
      )}
    </div>
  );
}

// # API との変換

function responseToFormData(response: TaskDetail): FormData {
  return {
    title: response.title,
    description: response.description ?? '',
    userIdAssingnedTo:
      response.user_assingned_to?.id == null
        ? null
        : String(response.user_assingned_to?.id),
    userIdVerifiedBy:
      response.user_verified_by?.id == null
        ? null
        : String(response.user_verified_by?.id),
    userIdInvolvedArray: response.user_involved_array.map((x) => String(x.id)),
    startDate:
      response.start_date == null
        ? null
        : dayjs(response.start_date, 'YYYY-MM-DD').toDate(),
    endDate:
      response.end_date == null
        ? null
        : dayjs(response.end_date, 'YYYY-MM-DD').toDate(),
    endCondition: response.end_condition ?? '',
  };
}

function formDataToPayload(formData: FormData): TaskPatchPayload {
  return {
    title: formData.title,
    description: formData.description || null,
    user_id_assingned_to:
      formData.userIdAssingnedTo == null
        ? null
        : Number(formData.userIdAssingnedTo),
    user_id_verified_by:
      formData.userIdVerifiedBy == null
        ? null
        : Number(formData.userIdVerifiedBy),
    start_date:
      formData.startDate == null
        ? null
        : dayjs(formData.startDate).format('YYYY-MM-DD'),
    end_date:
      formData.endDate == null
        ? null
        : dayjs(formData.endDate).format('YYYY-MM-DD'),
    end_condition: formData.endCondition || null,
  };
}

// # バリデーション
/** フォーム全体のバリデーション */
function validateAllFields(formData: FormData): FormErrors {
  const newErrors = Object.fromEntries(
    Object.keys(formData).map((key) => [
      key,
      validateTarget(key as keyof FormData, formData, validators),
    ])
  );

  return newErrors as FormErrors;
}

type Validators = Partial<
  Record<keyof FormData, (formData: FormData) => string[]>
>;
const validators: Validators = {
  title(form) {
    const newErrors: string[] = [];
    const value = form.title;
    if (value === '') {
      newErrors.push('必須');
    }
    if (value.length >= titleMaxLength + 1) {
      newErrors.push(`${titleMaxLength}文字以内`);
    }
    return newErrors;
  },
  description(form) {
    const value = form.description;
    const newErrors: string[] = [];
    if (value.length >= descriptionMaxLength + 1) {
      newErrors.push(`${descriptionMaxLength}文字以内`);
    }
    return newErrors;
  },
  userIdAssingnedTo: validateUsers,
  userIdVerifiedBy: validateUsers,
  userIdInvolvedArray(form) {
    const value = form.userIdInvolvedArray;
    const newErrors: string[] = [];
    if (value.length === 0) {
      newErrors.push('必須');
    }
    return newErrors;
  },
  startDate: validateDate,
  endDate: validateDate,
  endCondition(form) {
    const { endDate, endCondition } = form;
    const newErrors: string[] = [];
    if (endDate == null && endCondition === '') {
      newErrors.push('終了日が未定の場合は終了条件が必要です。');
    }
    return newErrors;
  },
};

/** 担当者, 承認者 */
function validateUsers(form: FormData) {
  const { userIdAssingnedTo, userIdVerifiedBy } = form;
  const newErrors: string[] = [];
  if (userIdAssingnedTo != null && userIdVerifiedBy != null) {
    if (userIdAssingnedTo === userIdVerifiedBy) {
      newErrors.push('担当者と承認者が同じです');
    }
  }
  return newErrors;
}

/** 開始日, 終了日 */
function validateDate(form: FormData) {
  const { startDate, endDate } = form;
  const newErrors: string[] = [];
  if (startDate != null && endDate != null) {
    if (endDate < startDate) {
      newErrors.push('開始日が終了日よりも後になっています');
    }
  }
  return newErrors;
}

/** 指定したフィールドだけバリデーションする */
function updateErrors(
  formData: FormData,
  prevErrors: FormErrors,
  validateTargetArray: Array<keyof FormData>
): FormErrors {
  const newErrors = Object.fromEntries(
    validateTargetArray.map((target) => {
      return [target, validateTarget(target, formData, validators)];
    })
  );
  return { ...prevErrors, ...newErrors };
}

/** validator がない場合は [] を返す */
function validateTarget(
  target: keyof FormData,
  formData: FormData,
  validators: Validators
): string[] {
  return validators[target]?.(formData) ?? [];
}
