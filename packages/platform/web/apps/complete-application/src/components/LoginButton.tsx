'use client';

import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'

export default function LoginButton({ session }: { session: any }) {
  if (session) {
    const router = useRouter()
    return (
      <>
        <Button onClick={() => signOut()} variant={"primary-scale"}>Sign out</Button>
        <Button onClick={() => router.push('/provider/dashboard')} variant={"primary-scale"}>Dashboard</Button>
      </>
    );
  }
  return (
    <>
      <Button variant={"primary-scale"} onClick={() => signIn()}>Sign in</Button>
    </>
  );
}
