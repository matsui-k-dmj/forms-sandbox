export function usersToSelectData(users: User[]) {
  return users.map((user) => ({ value: String(user.id), label: user.name }));
}
