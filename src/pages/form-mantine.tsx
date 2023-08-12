/**
 * mantine/formを使う
 *
 * form を dependency array に加えると無限ループする w
 * 普通に ...form.getInputProps('description') とか使ってると 他のフォームがrerenderingされる
 * onChange が変わってるんやろうし onCallbackとかの中で onChangeするのも意味ないんやろうな
 *
 */

import { useConfirmBeforeUnload } from '@/common/confirm-before-unload';
import { useForm } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchAllUsers,
  fetchConstTaskDetail,
  fetchTaskTemplate,
} from '@/common/stubs';
import { filterFalsy } from '@/common/filter-falsy';
import dayjs from 'dayjs';
import {
  taskTemplatesToSelectData,
  usersToSelectData,
} from '@/common/mintine-select';
import { Select, TextInput, Textarea, DateInput, Button } from '@/lib/mantine';

type FormData = {
  title: string;
  description: string;
  userIdAssingnedTo: string | null;
  userIdVerifiedBy: string | null;
  startDate: Date | null;
  endDate: Date | null;
  endCondition: string;
};

const titleMaxLength = 8;
const descriptionMaxLength = 20;

export default function FormMantine() {
  const form = useForm<FormData>({
    validateInputOnChange: true,
    initialValues: {
      title: '',
      description: '',
      userIdAssingnedTo: null,
      userIdVerifiedBy: null,
      startDate: null,
      endDate: null,
      endCondition: '',
    },
    validate: {
      title(value) {
        const newErrors: string[] = [];
        if (value === '') {
          newErrors.push('必須');
        }
        if (value.length >= titleMaxLength + 1) {
          newErrors.push(`${titleMaxLength}文字以内`);
        }
        return newErrors.length > 0 ? newErrors.join(', ') : null;
      },
      description(value) {
        const newErrors: string[] = [];
        if (value.length >= descriptionMaxLength + 1) {
          newErrors.push(`${descriptionMaxLength}文字以内`);
        }
        return newErrors.length > 0 ? newErrors.join(', ') : null;
      },
    },
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useConfirmBeforeUnload(form.isTouched());

  // # API Sync
  const queryConstTaskDetail = useQuery({
    queryKey: ['ConstTaskDetail'],
    queryFn: () => {
      return fetchConstTaskDetail;
    },
  });

  useEffect(() => {
    if (queryConstTaskDetail.data == null) return;
    form.setValues(responseToFormData(queryConstTaskDetail.data));
    // form を dependency array に加えると無限ループする w
    // eslint-disable-next-line
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

  return (
    <>
      <pre>{JSON.stringify(form.values, null, 2)}</pre>

      <div className="p-20">
        <div className="my-2">タスク編集</div>
        {queryConstTaskDetail.isLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="my-2">
              <TextInput
                label="タイトル"
                withAsterisk
                maxLength={titleMaxLength + 1}
                {...form.getInputProps('title')}
              />
            </div>
            <div className="my-2">
              <Textarea
                label="説明"
                maxLength={descriptionMaxLength + 1}
                {...form.getInputProps('description')}
              />
            </div>
          </>
        )}
      </div>
    </>
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
