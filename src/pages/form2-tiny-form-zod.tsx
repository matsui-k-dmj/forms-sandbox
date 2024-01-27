/**
 * lib-wo-validation を使ってみる
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
import { Controller, useForm } from '@/common/lib-wo-validation';
import * as z from 'zod';

const titleMaxLength = 8;

// zod でバリデーション
const formSchema = z
  .object({
    title: z.string().max(titleMaxLength).min(1, 'Required'),
    userIdAssingnedTo: z.string().nullable(),
    userIdVerifiedBy: z.string().nullable(),
    userIdInvolvedArray: z.array(z.string()).min(1, 'Required'),
    startDate: z.date().nullable(),
    endDate: z.date().nullable(),
  })
  // 複数フィールドに依存するバリデーションは refine で書く
  .refine(refineUsers, {
    message: '担当者と承認者が同じです',
    path: ['userIdAssingnedTo'],
  })
  .refine(refineUsers, {
    message: '担当者と承認者が同じです',
    path: ['userIdVerifiedBy'],
  });

function refineUsers({
  userIdAssingnedTo,
  userIdVerifiedBy,
}: {
  userIdAssingnedTo: string | null;
  userIdVerifiedBy: string | null;
}) {
  if (userIdAssingnedTo != null && userIdVerifiedBy != null) {
    if (userIdAssingnedTo === userIdVerifiedBy) {
      return false;
    }
  }
  return true;
}

type FormValues = z.infer<typeof formSchema>;

export default function Form2() {
  const { values, setValues, fieldsChanged, setFieldsChanged, control } =
    useForm<FormValues>({
      // 初期値を全部与えると型が単純になる
      initialValues: {
        title: '',
        userIdAssingnedTo: null,
        userIdVerifiedBy: null,
        userIdInvolvedArray: [],
        startDate: null,
        endDate: null,
      },
    });

  const [isSubmitted, setIsSubmitted] = useState(false);

  // values が変わったら全部のフィールドをバリデーションする。
  const fieldsErrors = useMemo(() => {
    const result = formSchema.safeParse(values);
    if (!result.success) {
      return result.error.format();
    }
  }, [values]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useConfirmBeforeUnload(hasSomeFieldsChanged(fieldsChanged));

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
    setValues(responseToFormValues(queryConstTaskDetail.data));
  }, [queryConstTaskDetail.data, setValues]);

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

  /** テンプレート選択 */
  const onChangeTemplate = useCallback(
    (value: string | null) => {
      setSelectedTemplateId(value);
      const selectedTemplate = queryTaskTemplates.data?.find(
        (template) => String(template.id) === value
      );
      setValues((values) => {
        return {
          ...values,
          title: selectedTemplate?.title ?? '',
          description: selectedTemplate?.description ?? '',
        };
      });
      // setValues するだけではバリデーションメッセージが出ないので fieldsChanged も更新
      setFieldsChanged((prev) => {
        return {
          ...prev,
          title: true,
          description: true,
        };
      });
    },
    [queryTaskTemplates.data, setValues, setFieldsChanged]
  );

  const onPost = useCallback(() => {
    setIsSubmitted(true);

    const isValid = fieldsErrors == null;
    // フォームがinvalidならAPIはコールしない。
    if (!isValid) {
      alert(`Errors:\n${JSON.stringify(fieldsErrors, null, 2)}`);
      return;
    }

    // フォームがvalidならペイロードに変換してAPIコール
    const payload = formValuesToPayload(values);
    alert(`Submit:\n${JSON.stringify(payload, null, 2)}`);
  }, [values, fieldsErrors]);

  /** isChanged か isSubmitted ならバリデーションメッセージを表示する */
  const getErr = (isChanged: boolean, name: keyof FormValues) => {
    return isChanged || isSubmitted
      ? fieldsErrors?.[name]?._errors.join(', ')
      : undefined;
  };

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
              name="title"
              transform={(e: ChangeEvent<HTMLInputElement>) => {
                return e.target.value;
              }}
              render={({ value, name, isChanged, onChange }) => {
                return (
                  <TextInput
                    label="タイトル"
                    withAsterisk
                    value={value}
                    error={getErr(isChanged, name)}
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
              name="userIdAssingnedTo"
              render={({ value, name, isChanged, onChange }) => {
                return (
                  <Select
                    label="担当者"
                    data={optionUsers}
                    searchable
                    clearable
                    nothingFound="No options"
                    value={value}
                    onChange={onChange}
                    error={getErr(isChanged, name)}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              name="userIdVerifiedBy"
              render={({ value, name, isChanged, onChange }) => {
                return (
                  <Select
                    label="承認者"
                    data={optionUsers}
                    searchable
                    clearable
                    nothingFound="No options"
                    value={value}
                    onChange={onChange}
                    error={getErr(isChanged, name)}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              name="userIdInvolvedArray"
              render={({ value, name, isChanged, onChange }) => {
                return (
                  <MultiSelect
                    label="関係者"
                    data={optionUsers}
                    searchable
                    clearable
                    nothingFound="No options"
                    value={value}
                    onChange={onChange}
                    error={getErr(isChanged, name)}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              name="startDate"
              render={({ value, name, isChanged, onChange }) => {
                return (
                  <DateInput
                    label="開始日"
                    valueFormat="YYYY/MM/DD"
                    clearable
                    value={value}
                    maxDate={values.endDate ?? undefined}
                    onChange={onChange}
                    error={getErr(isChanged, name)}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              name="endDate"
              render={({ value, name, isChanged, onChange }) => {
                return (
                  <DateInput
                    label="終了日"
                    valueFormat="YYYY/MM/DD"
                    clearable
                    value={value}
                    minDate={values.startDate ?? undefined}
                    onChange={onChange}
                    error={getErr(isChanged, name)}
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
  };
}

function formValuesToPayload(formValues: FormValues): TaskPatchPayload {
  return {
    title: formValues.title,
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
  };
}

/** changed なフィールドがあるか */
function hasSomeFieldsChanged(fieldsChanged: Record<string, boolean>) {
  return Object.values(fieldsChanged).some((v) => v);
}
