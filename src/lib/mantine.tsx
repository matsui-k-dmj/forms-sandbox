import {
  TextInput as _TextInput,
  Textarea as _Textarea,
  Select as _Select,
  Button as _Button,
  MultiSelect as _MultiSelect,
} from '@mantine/core';

import { DateInput as _DateInput } from '@mantine/dates';

import { ComponentProps, memo } from 'react';

export const TextInput = memo(function TextInput(
  props: ComponentProps<typeof _TextInput>
) {
  console.log(`Rendering TextInput ${props.label}: ${props.value}`);
  return <_TextInput {...props} />;
});

export const Textarea = memo(function Textarea(
  props: ComponentProps<typeof _Textarea>
) {
  console.log(`Rendering Textarea ${props.label}: ${props.value}`);
  return <_Textarea {...props} />;
});

export const Select = memo(function Select(
  props: ComponentProps<typeof _Select>
) {
  console.log(`Rendering Select ${props.label}: ${props.value}`);
  return <_Select {...props} />;
});

export const DateInput = memo(function DateInput(
  props: ComponentProps<typeof _DateInput>
) {
  console.log(`Rendering DateInput ${props.label}: ${props.value}`);
  return <_DateInput {...props} />;
});

export const Button = memo(function Button(
  props: ComponentProps<typeof _Button<'button'>>
) {
  console.log(`Rendering Button ${props.children}`);
  return <_Button {...props}> {props.children} </_Button>;
});

export const MultiSelect = memo(function MultiSelect(
  props: ComponentProps<typeof _MultiSelect>
) {
  console.log(`Rendering MultiSelect  ${props.label}: ${props.value}`);
  return <_MultiSelect {...props} />;
});
