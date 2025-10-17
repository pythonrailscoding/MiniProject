// noinspection JSUnresolvedReference

import React from 'react';
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import { Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    // Load JWT access token, at the start of boot
    React.useEffect(() => {
        const token = localStorage.getItem("access_token");
        setIsAuthenticated(!!token);
    }, [])

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        setIsAuthenticated(false);
    }


    const refreshAccessToken = async () => {
        const refresh = localStorage.getItem("refresh_token");
        if (!refresh) return false;

        const res = await fetch("http://127.0.0.1:5000/api/auth/refresh", {
            method: "POST",
            headers: { "Authorization": `Bearer ${refresh}` },
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("access_token", data.access_token);
            return true;
        } else {
            // refresh token expired or invalid
            handleLogout();
            return false;
        }
    };

    return (
            <Routes>
                <Route path="/register" element={
                    !isAuthenticated ? (<Register setIsAuthenticated={setIsAuthenticated}/>) : (<Navigate to="/" replace />)
                }/>
                <Route path="/login" element={
                    !isAuthenticated ? (<Login setIsAuthenticated={setIsAuthenticated}/>) : (<Navigate to="/" replace />)
                } />

                <Route path="/" element={
                    isAuthenticated ? (<Home handleLogout={handleLogout} refreshAccessToken={refreshAccessToken}/>) : (<Navigate to="/login" replace />)
                } />
            </Routes>
    );
};

export default App;