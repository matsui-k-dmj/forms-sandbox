/**
 * form1 の values, errors, isDirty をまとめて一つのstateにする
 * useCallbackの依存関係が減ってる。
 * 更新時にerror とか isDirtyについて考える必要があるから、忘れにくそう。
 * onPost でも setForm の中でいろいろやれれば, formへの依存がなくなってrerenderしなくて良くなる
 */

import { TextInput, Textarea } from '@/lib/mantine';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConstTaskDetail } from '@/common/stubs';
import { Controller, useForm } from 'react-hook-form';

// 感想: ローカルのフォームの型は optional じゃなくて null のほうが明示的に初期化する必要があるから分かりやすい
type FormValues = {
  title: string;
  description: string;
};

const titleMaxLength = 8;
const descriptionMaxLength = 20;

export default function FormRhf() {
  const {
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
    },
  });

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
    reset(responseToFormValues(queryConstTaskDetail.data));
  }, [queryConstTaskDetail.data]);

  return (
    <div className="p-20">
      <div className="my-2">タスク編集</div>
      {queryConstTaskDetail.isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div>{watch('description')}</div>
          <div className="my-2">
            <Controller
              control={control}
              name="title"
              rules={{
                required: 'Required',
                maxLength: {
                  value: titleMaxLength,
                  message: `Max length is ${titleMaxLength}`,
                },
                minLength: {
                  value: 2,
                  message: 'Min length is 2',
                },
                pattern: {
                  value: /^[A-Za-z]+$/i,
                  message: 'invalid pattern!',
                },
              }}
              render={({ field: { ref, ...rest }, fieldState: { error } }) => {
                console.log(error);
                return (
                  <TextInput
                    {...rest}
                    label="タイトル"
                    withAsterisk
                    error={error?.message}
                    maxLength={titleMaxLength + 1}
                  />
                );
              }}
            />
          </div>
          <div className="my-2">
            <Controller
              control={control}
              name="description"
              rules={{
                maxLength: {
                  value: descriptionMaxLength,
                  message: `Max length is ${descriptionMaxLength}`,
                },
              }}
              render={({ field: { ref, ...rest }, fieldState: { error } }) => {
                return (
                  <Textarea
                    {...rest}
                    label="説明"
                    error={error?.message}
                    maxLength={descriptionMaxLength + 1}
                  />
                );
              }}
            />
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
  };
}
