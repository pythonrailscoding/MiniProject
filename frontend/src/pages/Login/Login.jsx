import React from 'react';
import { Link } from 'react-router-dom'

const Login = ({setIsAuthenticated}) => {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": JSON.stringify({username: username, password: password})
            });

            const data = await res.json();
            if (res.ok) {
                setIsAuthenticated(true);
                localStorage.setItem("token", data.access_token);
                setError("")
            } else {
                setError(data.message || "Login failed.");
            }
        } catch (error) {
            console.error(error);
            setError("Server Error.");
        }
    }

    return (
        <div style={{ maxWidth: "400px", margin: "auto", padding: "2rem" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Login
        </button>
          <Link to="/register" style={{ padding: "0.5rem 1rem", textDecoration: "none", backgroundColor: "#eee", borderRadius: "4px" }}>
                    Go to Register
          </Link>
      </form>
    </div>
    );
};

export default Login;