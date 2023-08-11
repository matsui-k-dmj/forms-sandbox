/**
 * useState, useEffectだけの例
 * 全体は re-render されるが、関係ないフィールドは re-render されない
 *
 * 感想
 * 普通にわかりやすい。シンプル。
 *
 * タイトルのvalidationは zod とか使えばいけるけど、担当者 != 承認者, 開始 < 終了, 他のフォームの条件つきバリデーションなどは
 * カスタムにこんな感じで書くしかないやろうな
 *
 * isDirty 追加するのも個々のイベントハンドラにやればいいだけやし
 *
 * 他のフォームを re-renderさせてもいいとして、useCallbackがなくなるだけやな。慣れたら全然楽にかけるな。
 * dependency も別に eslint が効くから簡単に設定できる。
 *
 * まあ setFormData と setErrors で
 *  setFormData((prev) => {
 *     return { ...prev, title: value };
 *  });
 * こういうのいちいち書くのがだるいかも。
 *
 * data, error, isDirty をまとめて一つのstateにしてもいいかもな. それで
 * (prev) => {
 *     return { ...prev, title: value };
 *  }
 * を {title: value} だけ渡せばいいようにするとか
 *
 * useReducerで書けば, useCallbackで他のフォームデータを depencencyに 書く必要がなくなるんかな?。常に新しいのがprevに入ってくるから
 * いや。data, error, isDirty をまとめて一つのstateにして、そのsetStateの中でやれば同じ。
 * actionもそとで関数に分ければいいだけなんよな
 *
 * テンプレートから選択してタイトルと説明に代入するときに validation とかをちゃんと意識してしないとあかん。
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
  fetchTaskTemplate,
  fetchAllUsers,
  fetchConstTaskDetail,
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

export default function Form1() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    userIdAssingnedTo: null,
    userIdVerifiedBy: null,
    startDate: null,
    endDate: null,
    endCondition: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({
    title: [],
    description: [],
    userIdAssingnedTo: [],
    userIdVerifiedBy: [],
    startDate: [],
    endDate: [],
    endCondition: [],
  });
  const [isDirty, setIsDirty] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  // isDirtyなら閉じる前に警告
  useEffect(() => {
    if (!isDirty) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => {
      removeEventListener('beforeunload', f);
    };
  }, [isDirty]);

  // # API Sync
  const queryConstTaskDetail = useQuery({
    queryKey: ['ConstTaskDetail'],
    queryFn: () => {
      return fetchConstTaskDetail;
    },
  });

  useEffect(() => {
    if (queryConstTaskDetail.data == null) return;
    setFormData(responseToFormData(queryConstTaskDetail.data));
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
  // ## 個々のフォーム
  /** テンプレート選択 */
  const onChangeTemplate = useCallback(
    (value: string | null) => {
      setSelectedTemplateId(value);
      const selectedTemplate = queryTaskTemplates.data?.find(
        (template) => String(template.id) === value
      );

      setFormData((prev) => {
        return {
          ...prev,
          title: selectedTemplate?.title ?? '',
          description: selectedTemplate?.description ?? '',
        };
      });
      setErrors((prev) => ({
        ...prev,
        title: validateTitle(selectedTemplate?.title ?? ''),
      }));
      setIsDirty(true);
    },
    [queryTaskTemplates.data]
  );

  /** タイトル */
  const onChangeTitle = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setFormData((prev) => {
      return { ...prev, title: value };
    });

    setErrors((prev) => ({ ...prev, title: validateTitle(value) }));
    setIsDirty(true);
  }, []);

  /** 説明 */
  const onChangeDescription = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget.value;
      setFormData((prev) => ({
        ...prev,
        description: value,
      }));
      setIsDirty(true);
    },
    []
  );

  /** 担当者 */
  const onChangeUserIdAssingnedTo = useCallback(
    (value: string | null) => {
      setFormData((prev) => ({
        ...prev,
        userIdAssingnedTo: value,
      }));

      const newErrors = validateUsers(value, formData.userIdVerifiedBy);

      setErrors((prev) => ({
        ...prev,
        userIdAssingnedTo: newErrors,
        userIdVerifiedBy: newErrors,
      }));
      setIsDirty(true);
    },
    [formData.userIdVerifiedBy]
  );

  /** 承認者 */
  const onChangeUserIdVerifiedBy = useCallback(
    (value: string | null) => {
      setFormData((prev) => ({
        ...prev,
        userIdVerifiedBy: value,
      }));

      const newErrors = validateUsers(formData.userIdAssingnedTo, value);

      setErrors((prev) => ({
        ...prev,
        userIdAssingnedTo: newErrors,
        userIdVerifiedBy: newErrors,
      }));
      setIsDirty(true);
    },
    [formData.userIdAssingnedTo]
  );

  /** 開始日 */
  const onChangeStartDate = useCallback(
    (value: Date | null) => {
      setFormData((prev) => ({
        ...prev,
        startDate: value,
      }));

      const newErrors = validateDate(value, formData.endDate);
      setErrors((prev) => ({
        ...prev,
        startDate: newErrors,
        endDate: newErrors,
      }));
      setIsDirty(true);
    },
    [formData.endDate]
  );

  /** 終了日 */
  const onChangeEndDate = useCallback(
    (value: Date | null) => {
      setFormData((prev) => ({
        ...prev,
        endDate: value,
      }));

      const newErrors = validateDate(formData.startDate, value);
      setErrors((prev) => ({
        ...prev,
        startDate: newErrors,
        endDate: newErrors,
        endCondition: validateEndCondition(value, formData.endCondition),
      }));
      setIsDirty(true);
    },
    [formData.startDate, formData.endCondition]
  );

  /** 終了条件 */
  const onChangeEndCondition = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget.value;
      setFormData((prev) => ({
        ...prev,
        endCondition: value,
      }));

      const newErrors = validateEndCondition(formData.endDate, value);
      setErrors((prev) => ({
        ...prev,
        endCondition: newErrors,
      }));
      setIsDirty(true);
    },
    [formData.endDate]
  );

  /** 保存 */
  const onPost = useCallback(() => {
    const newErrors = validateForm(formData);
    setErrors(newErrors);
    if (Object.values(newErrors).some((errors) => errors.length > 0)) {
      window.alert(`Errors:\n${JSON.stringify(newErrors, null, 2)}`);
      return;
    }

    const payload = formDataToPayload(formData);
    window.alert(`Submit:\n${JSON.stringify(payload, null, 2)}`);
    setIsDirty(false);
  }, [formData]);

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
              error={errors.title.join(', ')}
              value={formData.title}
              onChange={onChangeTitle}
            />
          </div>
          <div className="my-2">
            <Textarea
              label="説明"
              value={formData.description}
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
              value={formData.userIdAssingnedTo}
              onChange={onChangeUserIdAssingnedTo}
              error={errors.userIdAssingnedTo.join(', ')}
            />
          </div>

          <div className="my-2">
            <Select
              label="承認者"
              data={optionUsers}
              searchable
              clearable
              nothingFound="No options"
              value={formData.userIdVerifiedBy}
              onChange={onChangeUserIdVerifiedBy}
              error={errors.userIdVerifiedBy.join(', ')}
            />
          </div>
          <div className="my-2">
            <DateInput
              label="開始日"
              valueFormat="YYYY/MM/DD"
              clearable
              value={formData.startDate}
              maxDate={formData.endDate ?? undefined}
              onChange={onChangeStartDate}
              error={errors.startDate.join(', ')}
            />
          </div>
          <div className="my-2">
            <DateInput
              label="終了日"
              valueFormat="YYYY/MM/DD"
              clearable
              value={formData.endDate}
              minDate={formData.startDate ?? undefined}
              onChange={onChangeEndDate}
              error={errors.endDate.join(', ')}
            />
          </div>
          {formData.endDate == null && (
            <div className="my-2">
              <Textarea
                label="終了条件"
                value={formData.endCondition}
                onChange={onChangeEndCondition}
                error={errors.endCondition.join(', ')}
                withAsterisk={formData.endDate == null}
              />
            </div>
          )}
          <div className="mt-4">
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
  if (value.length >= 21) {
    newErrors.push('20文字以内');
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
