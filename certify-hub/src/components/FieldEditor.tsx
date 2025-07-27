import React from 'react';
import { CertificateField } from '@/types/certificate';
import { FONT_FAMILIES } from '@/config/certificate';

interface FieldEditorProps {
  fields: CertificateField[];
  newFieldLabel: string;
  onNewFieldLabelChange: (value: string) => void;
  onFieldLabelChange: (id: string, label: string) => void;
  onFieldValueChange: (id: string, value: string) => void;
  onFieldFontSizeChange: (id: string, fontSize: number) => void;
  onFieldFontFamilyChange: (id: string, fontFamily: string) => void;
  onFieldColorChange: (id: string, color: string) => void;
  onFieldTextAlignChange: (id: string, textAlign: 'left' | 'center' | 'right') => void;
  onFieldShowToggle: (id: string, show: boolean) => void;
  onFieldDelete: (id: string) => void;
  onFieldAdd: () => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  fields,
  newFieldLabel,
  onNewFieldLabelChange,
  onFieldLabelChange,
  onFieldValueChange,
  onFieldFontSizeChange,
  onFieldFontFamilyChange,
  onFieldColorChange,
  onFieldTextAlignChange,
  onFieldShowToggle,
  onFieldDelete,
  onFieldAdd,
}) => {
  return (
    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">Fields</label>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.id} className="bg-gray-50 rounded p-3">
            {/* Field configuration row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <input
                type="text"
                value={field.label}
                onChange={e => onFieldLabelChange(field.id, e.target.value)}
                className="w-32 px-2 py-1 rounded border border-gray-300 text-sm"
                disabled={field.required}
                placeholder="Field label"
              />
              <input
                type="number"
                min={1}
                max={200}
                step={1}
                value={field.fontSize ?? 16}
                onChange={e => onFieldFontSizeChange(field.id, Number(e.target.value))}
                className="w-16 px-2 py-1 rounded border border-gray-300 text-sm"
                title="Font size"
              />
              <select
                value={field.fontFamily}
                onChange={e => onFieldFontFamilyChange(field.id, e.target.value)}
                className="px-2 py-1 rounded border border-gray-300 text-sm"
                title="Font family"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              {/* Text alignment selector */}
              <select
                value={field.textAlign || 'center'}
                onChange={e => onFieldTextAlignChange(field.id, e.target.value as 'left' | 'center' | 'right')}
                className="px-2 py-1 rounded border border-gray-300 text-sm"
                title="Text alignment"
              >
                <option value="left">⬅️ Left</option>
                <option value="center">↔️ Center</option>
                <option value="right">➡️ Right</option>
              </select>
              {/* Color picker */}
              <input
                type="color"
                value={field.color}
                onChange={e => onFieldColorChange(field.id, e.target.value)}
                className="w-8 h-8 border-0 bg-transparent cursor-pointer"
                title="Pick color"
              />
              {/* Show in preview toggle */}
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={field.showInPreview}
                  onChange={e => onFieldShowToggle(field.id, e.target.checked)}
                />
                Show
              </label>
              {!field.required && (
                <button 
                  type="button" 
                  onClick={() => onFieldDelete(field.id)} 
                  className="text-red-500 hover:text-red-700 text-xs px-2"
                >
                  Delete
                </button>
              )}
            </div>
            
            {/* Sample value input row */}
            <div className="border-t border-gray-200 pt-2">
              <label className="block text-xs text-gray-500 mb-1">Sample Value (for preview only)</label>
              <input
                type="text"
                value={field.value}
                onChange={e => onFieldValueChange(field.id, e.target.value)}
                className="w-full px-2 py-1 rounded border border-dashed border-gray-400 text-sm bg-yellow-50"
                placeholder="Input some sample to see how it looks like"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={newFieldLabel}
          onChange={e => onNewFieldLabelChange(e.target.value)}
          className="w-40 px-2 py-1 rounded border border-gray-300 text-sm"
          placeholder="New field label"
        />
        <button 
          type="button" 
          onClick={onFieldAdd} 
          className="px-3 py-1 rounded bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600"
        >
          Add Field
        </button>
      </div>
    </div>
  );
};