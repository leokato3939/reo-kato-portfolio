import React from 'react';

const ShelterModal = ({ isOpen, medication, shelters, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" style={{ display: 'block' }} onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{medication} - 避難所情報</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="shelter-list">
          {shelters.map((shelter, index) => (
            <div key={index} className="shelter-item">
              <span className="shelter-name">{shelter.name}</span>
              <span className="shelter-stock">{shelter.stock}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShelterModal; 