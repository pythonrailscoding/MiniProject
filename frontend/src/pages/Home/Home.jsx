import React from 'react';

const Home = ({setIsAuthenticated}) => {
    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem("token");
        setIsAuthenticated(false);
    }
    return (
        <div>
            <button onClick={handleLogout}>Logout</button>
            Home
        </div>
    );
};

export default Home;