import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');

    if (!accessToken) {
      router.push('/login');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user info');
        return res.json();
      })
      .then((data) => setUser(data))
      .catch((err) => {
        setError('Could not load user info');
        localStorage.removeItem('access_token');
        router.push('/login');
      });
  }, [router]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
      <h1>Welcome, {user.given_name || user.preferred_username}!</h1>
      <p>Email: {user.email}</p>
      <button
        onClick={() => {
          localStorage.removeItem('access_token');
          router.push('/login');
        }}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Log Out
      </button>
    </div>
  );
}