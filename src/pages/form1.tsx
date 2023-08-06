/**
 * useState, useEffectだけの例
 */

import { usersToSelectData } from '@/common/mintine-select';
import { Select, TextInput, Textarea, DateInput, Button } from '@/lib/mantine';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';

const allUsers: User[] = [
  { id: 1, name: '松山' },
  { id: 2, name: '横田' },
  { id: 3, name: '長谷川' },
  { id: 4, name: '千葉' },
  { id: 5, name: '五十嵐' },
  { id: 6, name: 'Boby' },
];

type FormData = {
  title: string;
  description: string;
  userIdAssingnedTo: string | null;
  userIdVerifiedBy: string | null;
  startDate: Date | null;
  endDate: Date | null;
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
  });
  const [errors, setErrors] = useState<FieldErrors>({
    title: [],
    description: [],
    userIdAssingnedTo: [],
    userIdVerifiedBy: [],
    startDate: [],
    endDate: [],
  });

  const optionUsers = useMemo(() => usersToSelectData(allUsers), []);

  const onChangeTitle = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.currentTarget.value;
      setFormData((prev) => {
        return { ...prev, title: value };
      });

      setErrors((prev) => ({ ...prev, title: validateTitle(value) }));
    },
    [setFormData]
  );

  const onChangeDescription = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget.value;
      setFormData((prev) => ({
        ...prev,
        description: value,
      }));
    },
    [setFormData]
  );

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
    },
    [formData.userIdVerifiedBy]
  );

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
    },
    [formData.userIdAssingnedTo]
  );

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
    },
    [formData.endDate]
  );

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
      }));
    },
    [formData.startDate]
  );

  const onPost = useCallback(() => {
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
    };

    setErrors(newErrors);
    if (
      Object.values(newErrors)
        .map((errors) => errors.length > 0)
        .some((hasError) => hasError)
    ) {
      return;
    }

    const payload: TaskPatchPayload = {
      title: formData.title,
      description: formData.description,
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
    };
    console.log('Submit', payload);
  }, [formData]);

  return (
    <div className="p-20">
      <div className="my-2">Edit Tasks</div>
      <div className="my-2">
        <TextInput
          label="Title"
          withAsterisk
          error={errors.title.join(', ')}
          value={formData.title}
          onChange={onChangeTitle}
        />
      </div>
      <div className="my-2">
        <Textarea
          label="Description"
          value={formData?.description ?? undefined}
          onChange={onChangeDescription}
        />
      </div>
      <div className="my-2">
        <Select
          label="Assigned To"
          data={optionUsers}
          searchable
          clearable
          nothingFound="No options"
          value={formData?.userIdAssingnedTo}
          onChange={onChangeUserIdAssingnedTo}
          error={errors.userIdAssingnedTo.join(', ')}
        />
      </div>

      <div className="my-2">
        <Select
          label="Verified By"
          data={optionUsers}
          searchable
          clearable
          nothingFound="No options"
          value={formData?.userIdVerifiedBy}
          onChange={onChangeUserIdVerifiedBy}
          error={errors.userIdVerifiedBy.join(', ')}
        />
      </div>
      <div className="my-2">
        <DateInput
          label="Start Date"
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
          label="End Date"
          valueFormat="YYYY/MM/DD"
          clearable
          value={formData.endDate}
          minDate={formData.startDate ?? undefined}
          onChange={onChangeEndDate}
          error={errors.endDate.join(', ')}
        />
      </div>
      <div>
        <Button onClick={onPost}>Submit</Button>
      </div>
    </div>
  );
}

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

function validateDate(startDate?: Date | null, endDate?: Date | null) {
  const newErrors: string[] = [];
  if (startDate != null && endDate != null) {
    if (endDate < startDate) {
      newErrors.push('開始日が終了日よりも後になっています');
    }
  }
  return newErrors;
}
