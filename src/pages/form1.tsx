import { TextInput, Textarea } from '@/lib/mantine';
import { ChangeEvent, useCallback, useState } from 'react';

type FormData = {
  title: string;
  description?: string;
  user_id_assingned_to?: number;
  user_id_verified_by?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
};

export default function Form1() {
  const [formData, setFormData] = useState<FormData>({ title: '' });
  const [errors, setErrors] = useState<Record<keyof FormData, string[]>>({
    title: [],
    description: [],
    user_id_assingned_to: [],
    user_id_verified_by: [],
    start_date: [],
    end_date: [],
  });

  const onChangeTitle = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.currentTarget?.value;
      setFormData((prev) => {
        return { ...prev, title: value };
      });
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

  return (
    <div className="p-20">
      <div>New Tasks</div>
      <div>
        <TextInput
          label="Title"
          value={formData.title}
          onChange={onChangeTitle}
        />
      </div>
      <div>
        <Textarea
          label="Description"
          value={formData?.description}
          onChange={onChangeDescription}
        />
      </div>
    </div>
  );
}
