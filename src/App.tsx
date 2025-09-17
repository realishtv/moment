import { useState, useEffect, useCallback } from 'react';
import { GITHUB_CLIENT_ID, GITHUB_SCOPES, GITHUB_REDIRECT_URI, VITE_GITHUB_TOKEN_EXCHANGE_URL } from './config';
import { Octokit } from 'octokit';

// GitHub OAuth authorization URL
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const exchangeCodeForToken = useCallback(async (authCode: string, signal: AbortSignal): Promise<string | null> => {
    try {
      const response = await fetch(VITE_GITHUB_TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: authCode,
          client_id: GITHUB_CLIENT_ID,
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
        signal,
      });
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('github_access_token', data.access_token);
        window.history.replaceState({}, document.title, window.location.pathname);
        return data.access_token;
      } else {
        setError(data.error_description || 'Failed to get access token');
        window.history.replaceState({}, document.title, window.location.pathname);
        return null;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Error exchanging code for token.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return null;
    }
  }, []);

  const fetchRepositories = useCallback(async (token: string, signal: AbortSignal) => {
    try {
      const octokit = new Octokit({ auth: token, request: { signal } });
      const { data } = await octokit.rest.repos.listForAuthenticatedUser();
      setRepositories(data);
      setIsAuthenticated(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        localStorage.removeItem('github_access_token');
        setIsAuthenticated(false);
        setError('Session expired or invalid. Please log in again.');
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const storedToken = localStorage.getItem('github_access_token');

      try {
        if (code) {
          const newToken = await exchangeCodeForToken(code, signal);
          if (newToken && !signal.aborted) {
            await fetchRepositories(newToken, signal);
          }
        } else if (storedToken) {
          await fetchRepositories(storedToken, signal);
        }
      } catch (err: any) {
         if (err.name !== 'AbortError') {
           setError('An unexpected error occurred during authentication.');
         }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    initAuth();

    return () => {
      controller.abort();
    };
  }, [exchangeCodeForToken, fetchRepositories]);

  const handleOAuthLogin = () => {
    const authUrl = `${GITHUB_AUTHORIZE_URL}?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=${GITHUB_SCOPES}`;
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('github_access_token');
    setIsAuthenticated(false);
    setRepositories([]);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <p>Authenticating...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Moment App</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {isAuthenticated ? (
        <div className="text-center w-full max-w-2xl">
          <p className="text-lg mb-4">Logged in to GitHub!</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Logout
          </button>
          {repositories.length > 0 ? (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Your Repositories:</h2>
              <ul className="list-disc list-inside bg-white p-4 rounded shadow">
                {repositories.map((repo) => (
                  <li key={repo.id} className="text-blue-600 text-left">
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                      {repo.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Loading repositories...</p>
          )}
        </div>
      ) : (
        <button
          onClick={handleOAuthLogin}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Login with GitHub
        </button>
      )}
    </div>
  );
}

export default App;