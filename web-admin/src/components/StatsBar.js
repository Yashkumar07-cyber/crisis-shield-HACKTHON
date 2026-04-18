import React from 'react';

export default function StatsBar({ incidents }) {
  return <div>{incidents.length}</div>;
}