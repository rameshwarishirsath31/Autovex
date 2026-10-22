import React from 'react';

export default function HealthGauge({ score = 100, size = 180, strokeWidth = 14, showGrade = true }) {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));
  
  // Radius & arc calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use 240-degree gauge arc
  const arcLength = circumference * 0.72;
  const strokeDashoffset = arcLength - (arcLength * normalizedScore) / 100;

  let color = '#10b981'; // Green
  let grade = 'A';
  let label = 'Optimal Condition';

  if (normalizedScore < 50) {
    color = '#ef4444'; // Red
    grade = 'F';
    label = 'Critical Hazard';
  } else if (normalizedScore < 70) {
    color = '#f97316'; // Orange
    grade = 'D';
    label = 'Service Due';
  } else if (normalizedScore < 85) {
    color = '#f59e0b'; // Amber
    grade = 'B';
    label = 'Fair Condition';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(140deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Animated active score */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.5s ease',
              filter: `drop-shadow(0 0 10px ${color}88)`
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: `${size * 0.22}px`, fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
            {normalizedScore}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
            Health Score
          </span>
          {showGrade && (
            <span
              style={{
                marginTop: '6px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: `${color}22`,
                color: color,
                border: `1px solid ${color}44`
              }}
            >
              Grade {grade}
            </span>
          )}
        </div>
      </div>
      <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', fontWeight: 600, color: color }}>
        {label}
      </p>
    </div>
  );
}
