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
        <Button onClick={() => signOut()} variant={"hero-secondary"}>Sign out</Button>
        <Button onClick={() => router.push('/dashboard')} variant={"hero-secondary"}>Dashboard</Button>
      </>
    );
  }
  return (
    <>
      <Button variant={"hero-secondary"} onClick={() => signIn()}>Sign in</Button>
    </>
  );
}
