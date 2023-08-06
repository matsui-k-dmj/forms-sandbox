import {
  TextInput as _TextInput,
  Textarea as _Textarea,
  Select as _Select,
} from '@mantine/core';
import { ComponentProps, memo } from 'react';

export const TextInput = memo(function TextInput(
  props: ComponentProps<typeof _TextInput>
) {
  console.log(`Rendering TextInput ${props.label}`);
  return <_TextInput {...props} />;
});

export const Textarea = memo(function Textarea(
  props: ComponentProps<typeof _Textarea>
) {
  console.log(`Rendering Textarea ${props.label}`);
  return <_Textarea {...props} />;
});

export const Select = memo(function Select(
  props: ComponentProps<typeof _Select>
) {
  console.log(`Rendering Select ${props.label}`);
  return <_Select {...props} />;
});