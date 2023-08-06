import { TextInput, Textarea } from '@mantine/core';
import { useState } from 'react';

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

  return (
    <div className="p-20">
      <div>New Tasks</div>
      <div>
        <TextInput
          label="Title"
          value={formData?.title}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, title: e.currentTarget?.value }));
          }}
        />
      </div>
      <div>
        <Textarea
          label="Description"
          value={formData?.description}
          onChange={(e) => {
            setFormData((prev) => ({
              ...prev,
              description: e.currentTarget?.value,
            }));
          }}
        />
      </div>
    </div>
  );
}
