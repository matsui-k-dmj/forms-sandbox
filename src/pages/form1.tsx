import { usersToSelectData } from '@/common/mintine-select';
import { Select, TextInput, Textarea } from '@/lib/mantine';
import {
  ChangeEvent,
  ComponentProps,
  useCallback,
  useMemo,
  useState,
} from 'react';

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
  description?: string;
  userIdAssingnedTo?: string | null;
  userIdVerifiedBy?: string | null;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

export default function Form1() {
  const [formData, setFormData] = useState<FormData>({ title: '' });
  const [errors, setErrors] = useState<Record<keyof FormData, string[]>>({
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
      const value = e.currentTarget?.value;
      setFormData((prev) => {
        return { ...prev, title: value };
      });

      const newErros: string[] = [];
      if (value === '') {
        newErros.push('必須');
      }
      if (value.length >= 21) {
        newErros.push('20文字以内');
      }
      setErrors((prev) => ({ ...prev, title: newErros }));
    },
    [setFormData]
  );

  const onChangeDescription = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget?.value;
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

      const newErros: string[] = [];
      if (value != null && formData.userIdVerifiedBy != null) {
        if (value === formData.userIdVerifiedBy) {
          newErros.push('担当者と承認者が同じです');
        }
      }
      setErrors((prev) => ({
        ...prev,
        userIdAssingnedTo: newErros,
        userIdVerifiedBy: newErros,
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

      const newErros: string[] = [];
      if (value != null && formData.userIdAssingnedTo != null) {
        if (value === formData.userIdAssingnedTo) {
          newErros.push('担当者と承認者が同じです');
        }
      }

      setErrors((prev) => ({
        ...prev,
        userIdAssingnedTo: newErros,
        userIdVerifiedBy: newErros,
      }));
    },
    [formData.userIdAssingnedTo]
  );

  return (
    <div className="p-20">
      <div className="my-2">New Tasks</div>
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
          value={formData?.description}
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
    </div>
  );
}
