import {
  TextInput as _TextInput,
  Textarea as _Textarea,
  Select as _Select,
  Button as _Button,
} from '@mantine/core';

import { DateInput as _DateInput } from '@mantine/dates';

import { ComponentProps, ReactNode, memo } from 'react';

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

export const DateInput = memo(function DateInput(
  props: ComponentProps<typeof _DateInput>
) {
  console.log(`Rendering DateInput ${props.label}`);
  return <_DateInput {...props} />;
});

export const Button = memo(function Button(
  props: ComponentProps<typeof _Button<'button'>> & {
    children?: ReactNode;
  }
) {
  console.log(`Rendering Button`);
  return <_Button {...props}> {props.children} </_Button>;
});
