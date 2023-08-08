const allUsers: User[] = [
  { id: 1, name: '松山' },
  { id: 2, name: '横田' },
  { id: 3, name: '長谷川' },
  { id: 4, name: '千葉' },
  { id: 5, name: '五十嵐' },
];

const constResponse: TaskDetail = {
  id: 1,
  title: 'デバッグする',
  user_assingned_to: allUsers[4],
  start_date: '2023-05-12',
  end_condition: 'QAの確認',
};

export const fetchConstTaskDetail = new Promise<TaskDetail>((resolve) =>
  setTimeout(() => {
    resolve(constResponse);
  }, 500)
);

export const fetchAllUsers = new Promise<User[]>((resolve) =>
  setTimeout(() => {
    resolve(allUsers);
  }, 2000)
);
