/**
 * リストを直接編集できるようにする。
 *
 * 親のstate更新は全部 setState(prev => ...) の中でやれば、useCallback を tasks に依存させなくていいので、
 * rerender を抑えられる。
 *
 * 親からもらった handler には sortValue を渡す必要があるので、Item の中でも useCallback でラップする必要がある。
 *
 * sortValue のやり方は Fractional Indexing っていうパターン
 */

import { Button, Select, TextInput } from '@/lib/mantine';
import { SelectItem } from '@mantine/core';
import { ChangeEvent, memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllUsers } from '@/common/stubs';
import { usersToSelectData } from '@/common/mintine-select';
import { filterFalsy } from '@/common/filter-falsy';
import { sortBy } from 'lodash-es';

type Item = {
  title: string;
  userId: string | null;
  sortValue: number;
};

export default function ListForm() {
  const [tasks, setTasks] = useState<Item[]>(
    sortBy(
      [
        { title: 'デバッグ2', userId: '2', sortValue: 1.5 },
        { title: 'デバッグ', userId: '1', sortValue: 1 },
        { title: 'デバッグ3', userId: '2', sortValue: 2 },
      ],
      'sortValue'
    )
  );
  const queryAllUsers = useQuery({
    queryKey: ['AllUsers'],
    queryFn: () => {
      return fetchAllUsers;
    },
  });

  // allUsers がまだ取れてないときはTaskDetailの中身で初期化しとく
  const optionUsers = useMemo(
    () => usersToSelectData(queryAllUsers.data ?? [].filter(filterFalsy)),
    [queryAllUsers.data]
  );

  const onChange = useCallback(
    (value: Partial<Item> & { sortValue: number }) => {
      setTasks((prev) => {
        const newTasks = prev.concat();
        const index = newTasks.findIndex(
          (item) => item.sortValue === value.sortValue
        );
        if (index === -1) return prev;

        newTasks[index] = {
          ...newTasks[index],
          ...value,
        };
        return newTasks;
      });
    },
    []
  );

  const onUp = useCallback((sortValue: number) => {
    setTasks((prev) => {
      const newTasks = prev.concat();
      const index = newTasks.findIndex((item) => item.sortValue === sortValue);
      if (index === -1) return prev; // 例外的に sortValueが存在しない場合。普通はある
      if (index === 0) return prev; // 既に一番上にあった場合そのまま

      const index1up = index - 1;
      // 2番目にあって、1番目になる場合。ランダムにsortValueを下げる
      if (index1up === 0) {
        newTasks[index] = {
          ...newTasks[index],
          sortValue:
            newTasks[index1up].sortValue - getRandomArbitrary(0.0, 1.0),
        };
        return sortBy(newTasks, 'sortValue');
      }

      // 一個上と2個上の間に挿入する場合。soutValueはその間のランダムな値にする。
      const newSortValue = getRandomArbitrary(
        newTasks[index1up - 1].sortValue,
        newTasks[index1up].sortValue
      );
      newTasks[index] = {
        ...newTasks[index],
        sortValue: newSortValue,
      };
      return sortBy(newTasks, 'sortValue');
    });
  }, []);

  const onDown = useCallback((sortValue: number) => {
    setTasks((prev) => {
      const newTasks = prev.concat();
      const index = newTasks.findIndex((item) => item.sortValue === sortValue);
      if (index === -1) return prev; // 例外的に sortValueが存在しない場合。普通はある
      if (index === newTasks.length - 1) return prev; // 既に一番下にあった場合はそのまま

      const index1down = index + 1;
      // 下から2番目にあって、一番下に行く場合。ランダムな値を sortValue に足す。
      if (index1down === newTasks.length - 1) {
        newTasks[index] = {
          ...newTasks[index],
          sortValue:
            newTasks[index1down].sortValue + getRandomArbitrary(0.0, 1.0),
        };
        return sortBy(newTasks, 'sortValue');
      }
      // 一個下と2個下の間に挿入する場合。soutValueはその間のランダムな値にする。
      const newSortValue = getRandomArbitrary(
        newTasks[index1down].sortValue,
        newTasks[index1down + 1].sortValue
      );
      newTasks[index] = {
        ...newTasks[index],
        sortValue: newSortValue,
      };
      return sortBy(newTasks, 'sortValue');
    });
  }, []);

  const onRemove = useCallback((sortValue: number) => {
    setTasks((prev) => {
      const newTasks = prev.concat();
      const index = newTasks.findIndex((item) => item.sortValue === sortValue);
      if (index === -1) return prev; // 例外的に sortValueが存在しない場合。普通はある
      newTasks.splice(index, 1);
      return newTasks;
    });
  }, []);

  const onAdd = useCallback(() => {
    setTasks((prev) => {
      const newTasks = prev.concat();
      newTasks.push({
        title: '',
        userId: null,
        sortValue:
          (newTasks.at(-1)?.sortValue ?? 0) + getRandomArbitrary(0.0, 1.0),
      });
      return newTasks;
    });
  }, []);

  return (
    <div className="p-20">
      <div>
        {tasks.map((task) => {
          return (
            <ListItem
              key={task.sortValue}
              item={task}
              optionUsers={optionUsers}
              onChange={onChange}
              onUp={onUp}
              onDown={onDown}
              onRemove={onRemove}
            />
          );
        })}
      </div>
      <div className="mx-2 my-4">
        <Button onClick={onAdd}>Add Task</Button>
      </div>
    </div>
  );
}

const ListItem = memo(function ListItem({
  item,
  optionUsers,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  item: Item;
  optionUsers: SelectItem[];
  onChange: (value: Partial<Item> & { sortValue: number }) => void;
  onUp: (sortValue: number) => void;
  onDown: (sortValue: number) => void;
  onRemove: (sortValue: number) => void;
}) {
  const onChangeTitle = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange({
        title: e.target.value,
        sortValue: item.sortValue,
      });
    },
    [item.sortValue, onChange]
  );

  const onChangeUserId = useCallback(
    (value: string | null) => {
      onChange({
        userId: value,
        sortValue: item.sortValue,
      });
    },
    [item.sortValue, onChange]
  );

  const onClickUp = useCallback(() => {
    onUp(item.sortValue);
  }, [item.sortValue, onUp]);

  const onClickDown = useCallback(() => {
    onDown(item.sortValue);
  }, [item.sortValue, onDown]);

  const onClickRemove = useCallback(() => {
    onRemove(item.sortValue);
  }, [item.sortValue, onRemove]);

  return (
    <div className="flex my-2">
      <div className="mx-2">
        <TextInput value={item.title} onChange={onChangeTitle} />
      </div>
      <div className="mx-2">
        <Select
          data={optionUsers}
          searchable
          clearable
          nothingFound="No options"
          value={item.userId}
          onChange={onChangeUserId}
        />
      </div>
      <div className="mx-1">
        <Button onClick={onClickUp}>Up</Button>
      </div>
      <div className="mx-1">
        <Button onClick={onClickDown}>Down</Button>
      </div>
      <div className="mx-1">
        <Button onClick={onClickRemove}>Remove</Button>
      </div>
    </div>
  );
});

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
