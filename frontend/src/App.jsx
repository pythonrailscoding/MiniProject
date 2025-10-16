import React from 'react';
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import { Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    // Load JWT access token, at the start of boot
    React.useEffect(() => {
        const token = localStorage.getItem("token");
        setIsAuthenticated(!!token);
    }, [])

    return (
            <Routes>
                <Route path="/register" element={
                    !isAuthenticated ? (<Register setIsAuthenticated={setIsAuthenticated}/>) : (<Navigate to="/" replace />)
                }/>
                <Route path="/login" element={
                    !isAuthenticated ? (<Login setIsAuthenticated={setIsAuthenticated}/>) : (<Navigate to="/" replace />)
                } />

                <Route path="/" element={
                    isAuthenticated ? (<Home setIsAuthenticated={setIsAuthenticated}/>) : (<Navigate to="/login" replace />)
                } />
            </Routes>
    );
};

export default App;