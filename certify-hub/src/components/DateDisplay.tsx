'use client';

import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

interface DateDisplayProps {
  date: string;
  variant?: 'body1' | 'body2' | 'caption';
}

export default function DateDisplay({ date, variant = 'body1' }: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    try {
      const dateObj = new Date(date);
      const formatted = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      setFormattedDate(formatted);
    } catch (error) {
      console.error('Error formatting date:', error);
      setFormattedDate(date);
    }
  }, [date]);

  return (
    <Typography variant={variant}>
      {formattedDate || 'Loading...'}
    </Typography>
  );
} 