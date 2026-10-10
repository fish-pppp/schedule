import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-2xl font-semibold">页面不存在</h1>
      <p className="mt-2 text-sm text-muted">这个地址没有对应的搭子组或页面。</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent">
        回到首页
      </Link>
    </main>
  );
}
