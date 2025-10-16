import React from 'react';
import {Link} from 'react-router-dom'

const Register = ({setIsAuthenticated}) => {
    const [username, setUsername] = React.useState("");
    const [password1, setPassword1] = React.useState("");
    const [password2, setPassword2] = React.useState("");
    const [error, setError] = React.useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password1 !== password2) {
            setError("Passwords don't match");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({username: username, password: password1})
            });

            const data = await res.json();
            if (res.ok) {
                setIsAuthenticated(true);
                localStorage.setItem("token", data.access_token);
                setUsername("");
                setPassword1("");
                setPassword2("");
            } else {
                setError(data.error || "Registration failed");
            }
        } catch (error) {
            console.log(error);
            setError("Server Error.");
        }
    }

    return (
        <div style={{ maxWidth: "400px", margin: "auto", padding: "2rem" }}>
      <h2>Register</h2>
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
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Confirm Password:</label>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Register
        </button>
          <Link to="/login" style={{ padding: "0.5rem 1rem", textDecoration: "none", backgroundColor: "#eee", borderRadius: "4px" }}>
                    Go to Login
          </Link>
      </form>
    </div>
    );
};

export default Register;