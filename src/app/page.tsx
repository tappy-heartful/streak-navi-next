import { redirect } from 'next/navigation';

export default function RootPage() {
  // アクセスがあったら即座に /login へ転送する
  redirect('/login');
}