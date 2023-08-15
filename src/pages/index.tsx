import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-20">
      <div className="my-2">
        <Link href="form1">form1</Link>
      </div>
      <div className="my-2">
        <Link href="form2">form2</Link>
      </div>
      <div className="my-2">
        <Link href="form2-dynamic">form2-dynamic</Link>
      </div>
      <div className="my-2">
        <Link href="list-form">list-form</Link>
      </div>
    </div>
  );
}
