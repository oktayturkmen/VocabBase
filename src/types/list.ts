export type ListRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
};

export type NewListRow = {
  name: string;
  description: string | null;
};

export type UpdateListRow = {
  name?: string;
  description?: string | null;
};
