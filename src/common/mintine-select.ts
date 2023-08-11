export function usersToSelectData(users: User[]) {
  return users.map((user) => ({ value: String(user.id), label: user.name }));
}

export function taskTemplatesToSelectData(templates: TaskTemplate[]) {
  return templates.map((template) => ({
    value: String(template.id),
    label: template.title,
  }));
}
