import React from 'react';

const Modal = ({title, setTitle, description, setDescription, setShowModal, handleSubmit, handleUpdateSubmit, isUpdate}) => {
    return (
                <div className="modal">
                        <div className="modal-content">
                            <form onSubmit={isUpdate ? handleUpdateSubmit : handleSubmit}>
                                <div className="input-group">
                                    <label>Task Title</label>
                                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required={true} />
                                </div>

                                <div className="input-group">
                                    <label>Description</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} required={true} />
                                </div>
                                <div className="modal-buttons">
                                    <button type="submit">{isUpdate ? "Update Task" : "Add Task" }</button>
                                    <button onClick={() => {setShowModal(false); isUpdate = !isUpdate}} className="cancel">Cancel</button>
                                </div>
                            </form>
                        </div>
                </div>
    );
};

export default Modal;