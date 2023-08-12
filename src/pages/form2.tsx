/**
 * form1 のdata, error, isDirty をまとめて一つのstateにする
 * useCallbackの依存関係が減ってる。
 * 更新時にerror とか isDirtyについて考える必要があるから、忘れにくそう。
 */

import {
  taskTemplatesToSelectData,
  usersToSelectData,
} from '@/common/mintine-select';
import { Select, TextInput, Textarea, DateInput, Button } from '@/lib/mantine';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { filterFalsy } from '@/common/filter-falsy';
import {
  fetchAllUsers,
  fetchConstTaskDetail,
  fetchTaskTemplate,
} from '@/common/stubs';

// 感想: ローカルのフォームの型は optional じゃなくて null のほうが明示的に初期化する必要があるから分かりやすい
type FormData = {
  title: string;
  description: string;
  userIdAssingnedTo: string | null;
  userIdVerifiedBy: string | null;
  startDate: Date | null;
  endDate: Date | null;
  endCondition: string;
};

type FieldErrors = Record<keyof FormData, string[]>;

const titleMaxLength = 8;

export default function Form2() {
  const [form, setForm] = useState<{
    data: FormData;
    error: FieldErrors;
    isDirty: boolean;
  }>({
    data: {
      title: '',
      description: '',
      userIdAssingnedTo: null,
      userIdVerifiedBy: null,
      startDate: null,
      endDate: null,
      endCondition: '',
    },
    error: {
      title: [],
      description: [],
      userIdAssingnedTo: [],
      userIdVerifiedBy: [],
      startDate: [],
      endDate: [],
      endCondition: [],
    },
    isDirty: false,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  // isDirtyなら閉じる前に警告
  useEffect(() => {
    if (!form.isDirty) return;

    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => {
      removeEventListener('beforeunload', f);
    };
  }, [form.isDirty]);

  // # API Sync
  const queryConstTaskDetail = useQuery({
    queryKey: ['ConstTaskDetail'],
    queryFn: () => {
      return fetchConstTaskDetail;
    },
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
      setForm(({ data, error }) => ({
        data: {
          ...data,
          title: selectedTemplate?.title ?? '',
          description: selectedTemplate?.description ?? '',
        },
        error: {
          ...error,
          title: validateTitle(selectedTemplate?.title ?? ''),
        },
        isDirty: true,
      }));
    },
    [queryTaskTemplates.data]
  );

  // ## 個々のフォーム
  /** タイトル */
  const onChangeTitle = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setForm(({ data, error }) => ({
      data: { ...data, title: value },
      error: { ...error, title: validateTitle(value) },
      isDirty: true,
    }));
  }, []);

  /** 説明 */
  const onChangeDescription = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget.value;
      setForm(({ data, error }) => ({
        data: { ...data, description: value },
        error: { ...error, title: validateTitle(value) },
        isDirty: true,
      }));
    },
    []
  );

  /** 担当者 */
  const onChangeUserIdAssingnedTo = useCallback((value: string | null) => {
    setForm(({ data, error }) => {
      const newErrors = validateUsers(value, data.userIdVerifiedBy);
      return {
        data: { ...data, userIdAssingnedTo: value },
        error: {
          ...error,
          userIdAssingnedTo: newErrors,
          userIdVerifiedBy: newErrors,
        },
        isDirty: true,
      };
    });
  }, []);

  /** 承認者 */
  const onChangeUserIdVerifiedBy = useCallback((value: string | null) => {
    setForm(({ data, error }) => {
      const newErrors = validateUsers(value, data.userIdAssingnedTo);
      return {
        data: { ...data, userIdVerifiedBy: value },
        error: {
          ...error,
          userIdAssingnedTo: newErrors,
          userIdVerifiedBy: newErrors,
        },
        isDirty: true,
      };
    });
  }, []);

  /** 開始日 */
  const onChangeStartDate = useCallback((value: Date | null) => {
    setForm(({ data, error }) => {
      const newErrors = validateDate(value, data.endDate);
      return {
        data: { ...data, startDate: value },
        error: {
          ...error,
          startDate: newErrors,
          endDate: newErrors,
        },
        isDirty: true,
      };
    });
  }, []);

  /** 終了日 */
  const onChangeEndDate = useCallback((value: Date | null) => {
    setForm(({ data, error }) => {
      const newErrors = validateDate(data.startDate, value);

      return {
        data: { ...data, endDate: value },
        error: {
          ...error,
          startDate: newErrors,
          endDate: newErrors,
          endCondition: validateEndCondition(value, data.endCondition),
        },
        isDirty: true,
      };
    });
  }, []);

  /** 終了条件 */
  const onChangeEndCondition = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget.value;
      setForm(({ data, error }) => {
        return {
          data: { ...data, endCondition: value },
          error: {
            ...error,
            endCondition: validateEndCondition(data.endDate, value),
          },
          isDirty: true,
        };
      });
    },
    []
  );

  /** 保存 */
  const onPost = useCallback(() => {
    const newErrors = validateForm(form.data);
    setForm((prev) => ({ ...prev, error: newErrors }));
    if (Object.values(newErrors).some((errors) => errors.length > 0)) {
      window.alert(`Errors:\n${JSON.stringify(newErrors, null, 2)}`);
      return;
    }

    const payload = formDataToPayload(form.data);
    window.alert(`Submit:\n${JSON.stringify(payload, null, 2)}`);
    setForm((prev) => ({ ...prev, isDirty: false }));
  }, [form.data]);

  return (
    <div className="p-20">
      <div className="my-2">タスク編集</div>
      {queryConstTaskDetail.isLoading ? (
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
function validateForm(formData: FormData): FieldErrors {
  const usersErrors = validateUsers(
    formData.userIdAssingnedTo,
    formData.userIdVerifiedBy
  );
  const dateErrors = validateDate(formData.startDate, formData.endDate);
  const newErrors: FieldErrors = {
    title: validateTitle(formData.title),
    description: [],
    userIdAssingnedTo: usersErrors,
    userIdVerifiedBy: usersErrors,
    startDate: dateErrors,
    endDate: dateErrors,
    endCondition: validateEndCondition(formData.endDate, formData.endCondition),
  };
  return newErrors;
}

/** タイトル */
function validateTitle(value: string) {
  const newErrors: string[] = [];
  if (value === '') {
    newErrors.push('必須');
  }
  if (value.length >= titleMaxLength + 1) {
    newErrors.push(`${titleMaxLength}文字以内`);
  }
  return newErrors;
}

/** 担当者, 承認者 */
function validateUsers(
  userIdAssingnedTo?: string | null,
  userIdVerifiedBy?: string | null
) {
  const newErrors: string[] = [];
  if (userIdAssingnedTo != null && userIdVerifiedBy != null) {
    if (userIdAssingnedTo === userIdVerifiedBy) {
      newErrors.push('担当者と承認者が同じです');
    }
  }
  return newErrors;
}

/** 開始日, 終了日 */
function validateDate(startDate?: Date | null, endDate?: Date | null) {
  const newErrors: string[] = [];
  if (startDate != null && endDate != null) {
    if (endDate < startDate) {
      newErrors.push('開始日が終了日よりも後になっています');
    }
  }
  return newErrors;
}

/** 終了条件 */
function validateEndCondition(
  endDate: FormData['endDate'],
  endCondition: FormData['endCondition']
) {
  const newErrors: string[] = [];
  if (endDate == null && endCondition === '') {
    newErrors.push('終了日が未定の場合は終了条件が必要です。');
  }
  return newErrors;
}
