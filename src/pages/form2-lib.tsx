/**
 * form1 の values, errors, isDirty をまとめて一つのstateにする
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
import { Controller, useForm } from '@/common/form-lib';

// 感想: ローカルのフォームの型は optional じゃなくて null のほうが明示的に初期化する必要があるから分かりやすい
type FormValues = {
  title: string;
  description: string;
  userIdAssingnedTo: string | null;
  userIdVerifiedBy: string | null;
  userIdInvolvedArray: string[];
  startDate: Date | null;
  endDate: Date | null;
  endCondition: string;
};

const titleMaxLength = 8;
const descriptionMaxLength = 20;

export default function Form2() {
  const {
    form,
    setForm,
    wrapSubmit,
    control,
    utils: { updateErrors },
  } = useForm<FormValues>({
    initialValues: {
      title: '',
      description: '',
      userIdAssingnedTo: null,
      userIdVerifiedBy: null,
      userIdInvolvedArray: [],
      startDate: null,
      endDate: null,
      endCondition: '',
    },
    validators: {
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
    },
    validatorsDeps: [],
  });

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
      values: responseToFormValues(queryConstTaskDetail.data),
    }));
  }, [queryConstTaskDetail.data, setForm]);

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
      setForm(({ values, errors }) => {
        const newValues = {
          ...values,
          title: selectedTemplate?.title ?? '',
          description: selectedTemplate?.description ?? '',
        };
        return {
          values: newValues,
          errors: updateErrors(newValues, errors, ['title', 'description']),
          isDirty: true,
        };
      });
    },
    [queryTaskTemplates.data, setForm, updateErrors]
  );

  // eslint-disable-next-line
  const onPost = useCallback(
    wrapSubmit(
      (formValues) => {
        const payload = formValuesToPayload(formValues);
        alert(`Submit:\n${JSON.stringify(payload, null, 2)}`);
      },
      (formErrors) => {
        alert(`Errors:\n${JSON.stringify(formErrors, null, 2)}`);
      }
    ),
    []
  );

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
            <Controller
              control={control}
              target="title"
              validateTargetArray={['title']}
              convertFn={(e: ChangeEvent<HTMLInputElement>) => {
                return e.target.value;
              }}
              render={({ value, error, onChange }) => {
                return (
                  <TextInput
                    label="タイトル"
                    withAsterisk
                    value={value}
                    error={error.join(', ')}
                    onChange={onChange}
                    maxLength={titleMaxLength + 1}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              target="description"
              validateTargetArray={['description']}
              convertFn={(e: ChangeEvent<HTMLTextAreaElement>) => {
                return e.target.value;
              }}
              render={({ value, error, onChange }) => {
                return (
                  <Textarea
                    label="説明"
                    value={value}
                    onChange={onChange}
                    maxLength={descriptionMaxLength + 1}
                    error={error.join(', ')}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              target="userIdAssingnedTo"
              validateTargetArray={['userIdAssingnedTo', 'userIdVerifiedBy']}
              render={({ value, error, onChange }) => {
                return (
                  <Select
                    label="担当者"
                    data={optionUsers}
                    searchable
                    clearable
                    nothingFound="No options"
                    value={value}
                    onChange={onChange}
                    error={error.join(', ')}
                  />
                );
              }}
            />
          </div>

          <div className="my-2">
            <Controller
              control={control}
              target="userIdVerifiedBy"
              validateTargetArray={['userIdAssingnedTo', 'userIdVerifiedBy']}
              render={({ value, error, onChange }) => {
                return (
                  <Select
                    label="承認者"
                    data={optionUsers}
                    searchable
                    clearable
                    nothingFound="No options"
                    value={value}
                    onChange={onChange}
                    error={error.join(', ')}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              target="userIdInvolvedArray"
              validateTargetArray={['userIdInvolvedArray']}
              render={({ value, error, onChange }) => {
                return (
                  <MultiSelect
                    label="関係者"
                    data={optionUsers}
                    searchable
                    clearable
                    nothingFound="No options"
                    value={value}
                    onChange={onChange}
                    error={error.join(', ')}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              target="startDate"
              validateTargetArray={['startDate', 'endDate']}
              render={({ value, error, onChange }) => {
                return (
                  <DateInput
                    label="開始日"
                    valueFormat="YYYY/MM/DD"
                    clearable
                    value={value}
                    maxDate={form.values.endDate ?? undefined}
                    onChange={onChange}
                    error={error.join(', ')}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              target="endDate"
              validateTargetArray={['startDate', 'endDate', 'endCondition']}
              render={({ value, error, onChange }) => {
                return (
                  <DateInput
                    label="終了日"
                    valueFormat="YYYY/MM/DD"
                    clearable
                    value={value}
                    minDate={form.values.startDate ?? undefined}
                    onChange={onChange}
                    error={error.join(', ')}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              target="endCondition"
              validateTargetArray={['endCondition']}
              convertFn={(e: ChangeEvent<HTMLTextAreaElement>) => {
                return e.currentTarget.value;
              }}
              render={({ value, error, onChange }) => {
                return (
                  <Textarea
                    label="終了条件"
                    value={value}
                    onChange={onChange}
                    error={error.join(', ')}
                    withAsterisk={form.values.endDate == null}
                  />
                );
              }}
            />
          </div>
          <div>
            <Button onClick={onPost}>保存</Button>
          </div>
        </>
      )}
    </div>
  );
}

// # API との変換

function responseToFormValues(response: TaskDetail): FormValues {
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

function formValuesToPayload(formValues: FormValues): TaskPatchPayload {
  return {
    title: formValues.title,
    description: formValues.description || null,
    user_id_assingned_to:
      formValues.userIdAssingnedTo == null
        ? null
        : Number(formValues.userIdAssingnedTo),
    user_id_verified_by:
      formValues.userIdVerifiedBy == null
        ? null
        : Number(formValues.userIdVerifiedBy),
    start_date:
      formValues.startDate == null
        ? null
        : dayjs(formValues.startDate).format('YYYY-MM-DD'),
    end_date:
      formValues.endDate == null
        ? null
        : dayjs(formValues.endDate).format('YYYY-MM-DD'),
    end_condition: formValues.endCondition || null,
  };
}

// # バリデーション

/** 担当者, 承認者 */
function validateUsers(form: FormValues) {
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
function validateDate(form: FormValues) {
  const { startDate, endDate } = form;
  const newErrors: string[] = [];
  if (startDate != null && endDate != null) {
    if (endDate < startDate) {
      newErrors.push('開始日が終了日よりも後になっています');
    }
  }
  return newErrors;
}
