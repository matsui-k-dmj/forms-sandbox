React のフォームの書き方の勉強

form2 のように data, error, isDirty を全部同じ useState で持って、地道に useCallback を書くのが良かった。useCallback 内の setForm(prev => ...) でやれば, useCallback は form などに依存しないので、rerendering を防げる。

list-form ではリストのアイテムを直接編集するときに、他のアイテムは rerender させない実装。ソートするのに fractal indexing も使ってる。

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
