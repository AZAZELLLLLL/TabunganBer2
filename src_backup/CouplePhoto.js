import React, { useState } from "react";
import "./CouplePhoto.css";

export default function CouplePhoto() {
  const [cropLeft, setCropLeft] = useState(0);
  const [cropTop, setCropTop] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <div className="couple-photo-container">
      <div className="love-border-wrapper">
        {/* Love shape di kiri (Cewe) */}
        <div className="love-shape left">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M50,95 C25,70 5,55 5,35 C5,15 20,5 30,5 C40,5 50,15 50,25 C50,15 60,5 70,5 C80,5 95,15 95,35 C95,55 75,70 50,95 Z"
              fill="none"
              stroke="#D4869B"
              strokeWidth="2"
            />
          </svg>
          <div
            className="photo-frame cewe"
            style={{
              backgroundImage: `none`,
              backgroundColor: 'transparent',
            }}
          ></div>
        </div>

        {/* Love shape di kanan (Cowo) */}
        <div className="love-shape right">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M50,95 C25,70 5,55 5,35 C5,15 20,5 30,5 C40,5 50,15 50,25 C50,15 60,5 70,5 C80,5 95,15 95,35 C95,55 75,70 50,95 Z"
              fill="none"
              stroke="#8B6F9E"
              strokeWidth="2"
            />
          </svg>
          <div
            className="photo-frame cowo"
            style={{
              backgroundImage: `none`,
              backgroundColor: 'transparent',
            }}
          ></div>
        </div>
      </div>

      {/* Controls */}
      <div className="photo-controls">
        <div className="control-group">
          <label>Posisi Horizontal:</label>
          <input
            type="range"
            min="-150"
            max="150"
            value={cropLeft}
            onChange={(e) => setCropLeft(parseInt(e.target.value))}
            className="slider"
          />
        </div>

        <div className="control-group">
          <label>Posisi Vertikal:</label>
          <input
            type="range"
            min="-100"
            max="100"
            value={cropTop}
            onChange={(e) => setCropTop(parseInt(e.target.value))}
            className="slider"
          />
        </div>

        <div className="control-group">
          <label>Zoom:</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className="slider"
          />
        </div>
      </div>
    </div>
  );
}