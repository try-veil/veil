'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the access token in a cookie (HTTP-only, set in API route)
        router.push('/dashboard');
      } else {
        setError(data.error_description || 'Login failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
    const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL;
    const redirectUri = encodeURIComponent('http://localhost:3000/callback'); // Update for production
    const authUrl = `${fusionAuthUrl}/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&identityProviderId=${provider}`;
    router.push(authUrl);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
      <h1>Log In</h1>
      <form onSubmit={handlePasswordSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="username">Username or Email</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <div style={{ marginTop: '20px' }}>
        <p>Or log in with:</p>
        <button
          onClick={() => handleSocialLogin('82339786-3dff-42a6-aac6-1f1ceecb6c46')}
          style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#4285F4', color: 'white' }}
        >
          Log in with Google
        </button>
        <button
          onClick={() => handleSocialLogin(process.env.NEXT_PUBLIC_GITHUB_IDENTITY_PROVIDER_ID || "")}
          style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#333', color: 'white' }}
        >
          Log in with GitHub
        </button>
      </div>
    </div>
  );
}