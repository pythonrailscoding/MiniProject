// noinspection JSUnresolvedReference,DuplicatedCode

import React from 'react';
import './Home.css'
import Modal from "./components/Modal.jsx";

const Home = ({handleLogout, refreshAccessToken}) => {

    const [taskList, setTaskList] = React.useState([])
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [showModal, setShowModal] = React.useState(false);
    const [isUpdate, setIsUpdate] = React.useState(false);
    const [taskID, setTaskID] = React.useState("");

    const showTooltip = (e, description) => {
        const tooltip = document.getElementById("tooltip");
        tooltip.innerText = description;

        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.style.top = `${rect.top + window.scrollY}px`; // vertical position
        tooltip.style.left = `${rect.right + 10}px`;           // right of the row
        tooltip.style.opacity = 1;
    };

    const hideTooltip = () => {
        const tooltip = document.getElementById("tooltip");
        tooltip.style.opacity = 0;
    };


    React.useEffect( () => {
        async function fetchTasks() {
            const res = await fetch("http://127.0.0.1:5000/api/todos", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setTaskList(data)
            } else {
                console.error(res);
            }
        }

        fetchTasks();
    }, [])

    React.useEffect( () => {
        if (!isUpdate) {
            setTitle("")
            setDescription("");
            setTaskID("");
        }
    }, [isUpdate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUpdate(false);

        const token = localStorage.getItem("access_token");

        try {
            let res = await fetch("http://127.0.0.1:5000/api/todos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                })
            });

            // Access token expired
            if (res.status === 401) {
                const refreshed = await refreshAccessToken(); // Gives you true and false answers
                if (!refreshed) {
                    // You are logged out by refreshAccessToken
                    return;
                }

                // You have true, means new access token generated
                // Retry request
                const newToken = localStorage.getItem("access_token");
                res = await fetch("http://127.0.0.1:5000/api/todos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${newToken}`,
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                    })
                });
            }

            if (res.ok) {
                const data = await res.json();

                // prevList is previous state of taskList. You can name that anything, you basically appended data on top of prevList
                setTaskList(prevList => [data, ...prevList]);

                setTitle("");
                setDescription("");
                setShowModal(false);
            } else {
                console.error(res);
                setTitle("");
                setDescription("");
                setShowModal(false);
            }
        } catch (error) {
            alert(error);
            console.error(error);
        }
    }

    const toggleCompletion = async (e, id) => {
        e.preventDefault();

        try {
            let res = await fetch(`http://127.0.0.1:5000/api/todos/${id}`, {
               method: "PATCH",
               headers: {
                   "Content-Type": "application/json",
                   "Authorization": `Bearer ${localStorage.getItem("access_token")}`
               }
            });

            // Access token expired
            if (res.status === 401) {
                const refreshed = await refreshAccessToken(); // Gives you true and false answers
                if (!refreshed) {
                    // You are logged out by refreshAccessToken
                    return;
                }

                // You have true, means new access token generated
                // Retry request
                const newToken = localStorage.getItem("access_token");
                res = await fetch(`http://127.0.0.1:5000/api/todos/${id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${newToken}`,
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                    })
                });
            }

            if (res.ok) {
                // Update React state
                setTaskList(prevList =>
                    /*
                        { ...task } copies all its properties into a new object.
                        Then completed: !task.completed overwrites just the completed property in the new object.
                    */
                    prevList.map(task =>
                        task._id === id ? { ...task, completed: !task.completed } : task
                    )
                );
            } else {
                console.error(res);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleDelete = async (e, id) => {
        e.preventDefault();

        try {
            let res = await fetch(`http://127.0.0.1:5000/api/todos/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });

            // Access token expired
            if (res.status === 401) {
                const refreshed = await refreshAccessToken(); // Gives you true and false answers
                if (!refreshed) {
                    // You are logged out by refreshAccessToken
                    return;
                }

                // You have true, means new access token generated
                // Retry request
                const newToken = localStorage.getItem("access_token");
                res = await fetch(`http://127.0.0.1:5000/api/todos/${id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${newToken}`,
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                    })
                });
            }

            if (res.ok) {
                setTaskList(prevList => prevList.filter(task => task._id !== id)); // filter() removes that task
            } else {
                console.error(res);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleUpdateModal = async (e, id) => {
        e.preventDefault();

        setIsUpdate(true);

        const task = taskList.find(task => task._id === id);
        setTitle(task.title);
        setDescription(task.description);
        setTaskID(id)
        setShowModal(true)
    }

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();

        try {
            let res = await fetch(`http://127.0.0.1:5000/api/todos/${taskID}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                })
            });

            // Access token expired
            if (res.status === 401) {
                const refreshed = await refreshAccessToken(); // Gives you true and false answers
                if (!refreshed) {
                    // You are logged out by refreshAccessToken
                    return;
                }

                // You have true, means new access token generated
                // Retry request
                const newToken = localStorage.getItem("access_token");
                res = await fetch(`http://127.0.0.1:5000/api/todos/${taskID}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${newToken}`,
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                    })
                });
            }

            if (res.ok) {
                const data = await res.json();
                setTaskList(prevList => prevList.map(task => task._id === data._id ? data : task));
                setTitle("");
                setDescription("");
                setShowModal(false);
                setIsUpdate(false);
                setTaskID("");
                return;
            } else {
                console.error(res);
            }
        } catch (e) {
            console.error(e);
        }

        setIsUpdate(false);
    }

    const handleMassCompleteDelete = async (e) => {
        e.preventDefault();

        try {
            let res = await fetch(`http://127.0.0.1:5000/api/todos/delete_completed_tasks`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });

            // Access token

            if (res.status === 401) {
                const refreshed = await refreshAccessToken(); // Gives you true and false answers
                if (!refreshed) {
                    // You are logged out by refreshAccessToken
                    return;
                }

                // You have true, means new access token generated
                // Retry request
                const newToken = localStorage.getItem("access_token");
                res = await fetch(`http://127.0.0.1:5000/api/todos/${taskID}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${newToken}`,
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                    })
                });
            }

            if (res.ok) {
                const data = await res.json();
                setTaskList(prevList => prevList.filter(task => task.completed === false));
                alert(data.message);
            } else {
                console.error(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    }

    // noinspection JSUnresolvedReference
    return (
        <div>
            <button onClick={(e) => handleLogout(e)}>Logout</button>
            <div className="container">
                <button className="add-btn" onClick={() => {setShowModal(true)}}>Add a Task</button>
                <button className="cancel" onClick={(e) => handleMassCompleteDelete(e)}>Delete all completed tasks</button>
                {showModal && (
                    <Modal setTitle={setTitle} setDescription={setDescription} setShowModal={setShowModal} isUpdate={isUpdate} title={title} description={description} handleSubmit={handleSubmit} handleUpdateSubmit={handleUpdateSubmit} />
                )}

                <div className="task-list">
                    {taskList.map(task => (
                        <div
                            key={task._id}
                            className={`task-item ${task.completed ? 'completed' : ''}`}
                            onMouseEnter={(e) => showTooltip(e, task.description)}
                            onMouseLeave={hideTooltip}
                        >
                            <div className="status-strip"></div>

                            <div className="task-content">
                                <h3>{task.title}</h3>
                            </div>

                            <div className="task-actions">
                                <span className="icon update" onClick={(e) => handleUpdateModal(e, task._id)}>✏️</span>
                                <span className="icon delete" onClick={(e) => handleDelete(e, task._id)}>🗑️</span>
                                <span className="icon toggle" onClick={(e) => toggleCompletion(e, task._id)}>{task.completed ? "❌" : "✔️"}</span>
                            </div>
                        </div>
                    ))}

                    {/* Tooltip element outside all rows */}
                    <div id="tooltip" className="tooltip"></div>
                </div>
            </div>
        </div>
    );
};

export default Home;