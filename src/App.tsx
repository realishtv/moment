import { useState, useEffect, useCallback } from 'react';
import { VITE_AUTH_SERVER_LOGIN_URL } from './config';
import { Octokit } from 'octokit';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      // Step 1: Check for an access token in the URL hash (from the auth server redirect).
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const storedToken = localStorage.getItem('github_access_token');

      let tokenToUse: string | null = null;

      if (accessToken) {
        tokenToUse = accessToken;
        localStorage.setItem('github_access_token', tokenToUse);
        // Clean the URL for a better user experience.
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } else if (storedToken) {
        tokenToUse = storedToken;
      }

      // Step 2: If we have a token (either from hash or storage), fetch data.
      if (tokenToUse) {
        await fetchRepositories(tokenToUse, signal);
      }
      
      setIsLoading(false);
    };
    
    initAuth();

    return () => {
      controller.abort();
    };
  }, [fetchRepositories]);

  const handleOAuthLogin = () => {
    // The client now redirects to YOUR auth server, passing its own redirect URI
    // as the "return address".
    const clientRedirectUri = window.location.origin + window.location.pathname;
    const authUrl = `${VITE_AUTH_SERVER_LOGIN_URL}?client_redirect_uri=${encodeURIComponent(clientRedirectUri)}`;
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('github_access_token');
    setIsAuthenticated(false);
    setRepositories([]);
    setError(null);
  };

  // The rest of your JSX remains the same...
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
