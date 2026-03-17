import { redirect } from 'next/navigation';

export default function RootPage() {
  // アクセスがあったら /home へ転送（ログインしていなければAuthGuardが/loginへ飛ばす）
  redirect('/home');
}