type TaskDetail = {
  id: number;
  title: string;
  description?: string;
  user_assingned_to?: User;
  user_verified_by?: User;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
};

type TaskPostPayload = {
  title: string;
  description?: string;
  user_id_assingned_to?: number;
  user_id_verified_by?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
};

type TaskPatchPayload = {
  title?: string | null;
  description?: string | null;
  user_id_assingned_to?: number | null;
  user_id_verified_by?: number | null;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
};

type User = {
  id: number;
  name: string;
};
