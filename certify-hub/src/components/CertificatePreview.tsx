'use client';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import Draggable from 'react-draggable';
import { CertificatePreviewProps } from '@/types/certificate';

const CertificatePreview = forwardRef(function CertificatePreview({
  template,
  fields,
  onFieldPositionChange,
  maxWidth = 800,
  maxHeight = 600,
}: CertificatePreviewProps, ref) {
  // Generate ref for each field
  const nodeRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  fields.forEach(field => {
    if (!nodeRefs.current[field.id]) {
      nodeRefs.current[field.id] = React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>;
    }
  });

  const [imgSize, setImgSize] = useState({ width: 600, height: 320 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Helper function to calculate text dimensions consistently
  const calculateTextDimensions = (text: string, fontSize: number, fontFamily?: string) => {
    // Create temporary element to measure text dimensions
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'pre';
    tempDiv.style.fontSize = `${fontSize}px`;
    tempDiv.style.fontFamily = fontFamily || 'serif';
    tempDiv.style.fontWeight = '600';
    tempDiv.textContent = text;
    document.body.appendChild(tempDiv);
    
    const width = tempDiv.offsetWidth;
    const height = tempDiv.offsetHeight;
    document.body.removeChild(tempDiv);
    
    return { width, height };
  };

  useEffect(() => {
    setImgSize({ width: 600, height: 320 });
    setIsImgLoaded(false);
  }, [template.thumbnail]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    setIsImgLoaded(true);
  };

  // Keep aspect ratio for adaptive scaling
  let scale = 1;
  let scaledWidth = imgSize.width;
  let scaledHeight = imgSize.height;
  if (imgSize.width && imgSize.height) {
    const widthRatio = maxWidth / imgSize.width;
    const heightRatio = maxHeight / imgSize.height;
    scale = Math.min(widthRatio, heightRatio, 1);
    scaledWidth = imgSize.width * scale;
    scaledHeight = imgSize.height * scale;
  }

  const handleDragStop = (id: string, x: number, y: number) => {
    // Simply store the element's top-left corner position
    onFieldPositionChange(id, x / scale, y / scale);
  };

  // Create a temporary clean certificate element for PDF export
  const createCleanCertificateElement = () => {
    if (!isImgLoaded) return null;
    
    const cleanDiv = document.createElement('div');
    cleanDiv.style.position = 'relative';
    cleanDiv.style.width = `${imgSize.width}px`;
    cleanDiv.style.height = `${imgSize.height}px`;
    cleanDiv.style.background = 'white';
    
    // Add template image
    const img = document.createElement('img');
    img.src = template.thumbnail;
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    cleanDiv.appendChild(img);
    
    // Add fields that should show in preview
    fields.filter(field => field.showInPreview && field.value).forEach(field => {
      const fieldDiv = document.createElement('div');
      fieldDiv.style.position = 'absolute';
      
      // Calculate text dimensions
      const fontSize = field.fontSize || 16;
      const fontFamily = field.fontFamily || 'serif';
      
      const { width: textWidth, height: textHeight } = calculateTextDimensions(
        field.value, 
        fontSize, 
        fontFamily
      );
      
      // field.position stores the top-left corner position
      const startX = field.position.x;
      const startY = field.position.y;
      const textAlign = field.textAlign || 'center';
      
      // Adjust vertical position to account for vertical centering in preview
      const adjustedStartY = startY - textHeight / 2;
      
      fieldDiv.style.left = `${startX}px`;
      fieldDiv.style.top = `${adjustedStartY}px`;
      fieldDiv.style.fontSize = `${fontSize}px`;
      fieldDiv.style.fontFamily = fontFamily;
      fieldDiv.style.color = field.color || '#000000';
      fieldDiv.style.fontWeight = '600';
      fieldDiv.style.whiteSpace = 'pre';
      fieldDiv.style.textAlign = textAlign;
      fieldDiv.style.zIndex = '2';
      fieldDiv.textContent = field.value;
      cleanDiv.appendChild(fieldDiv);
    });
    
    return cleanDiv;
  };
  
  // Expose methods
  useImperativeHandle(ref, () => ({
    getTemplateDimensions: () => ({
      width: imgSize.width,
      height: imgSize.height,
      scale,
      scaledWidth,
      scaledHeight
    }),
    
    async exportToPDF(filename = 'certificate.pdf', returnBlob = false) {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      if (!isImgLoaded) return;
      
      // Create clean certificate element
      const cleanElement = createCleanCertificateElement();
      if (!cleanElement) return;
      
      // Temporarily add to DOM for rendering (positioned off-screen)
      cleanElement.style.position = 'fixed';
      cleanElement.style.left = '-9999px';
      cleanElement.style.top = '-9999px';
      document.body.appendChild(cleanElement);
      
      try {
        // Wait for image to load in clean element
        const img = cleanElement.querySelector('img');
        if (img && !img.complete) {
          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        
        // Capture the clean certificate
        const canvas = await html2canvas(cleanElement, { 
          useCORS: true, 
          backgroundColor: 'white',
          scale: 1,
          width: imgSize.width,
          height: imgSize.height
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        if (returnBlob) {
          return pdf.output('blob');
        } else {
          pdf.save(filename);
        }
      } finally {
        // Remove temporary element
        document.body.removeChild(cleanElement);
      }
    }
  }));

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-lg overflow-hidden border border-gray-300 shadow flex items-center justify-center"
      style={{ width: maxWidth, height: maxHeight, minHeight: 200 }}
    >
      <div
        ref={certificateRef}
        className="absolute left-1/2 top-1/2"
        style={{
          width: scaledWidth,
          height: scaledHeight,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Background layer */}
        <img
          ref={imgRef}
          src={template.thumbnail}
          alt={template.name}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          style={{ zIndex: 1 }}
          onLoad={handleImgLoad}
          draggable={false}
        />
        {/* Field layer: Draggable */}
        {isImgLoaded && fields.filter(field => field.showInPreview).map((field) => {
          const isDragging = draggingId === field.id;
          const hasValue = Boolean(field.value?.trim());
          const fontSize = (field.fontSize ?? 16) * scale;
          
          // Use the stored position directly (top-left corner)
          const elementX = field.position.x * scale;
          const elementY = field.position.y * scale;
          
          // Calculate transform based on text alignment
          const textAlign = field.textAlign || 'center';
          const getTransform = () => {
            switch (textAlign) {
              case 'left': return 'translate(0%, -50%)';
              case 'right': return 'translate(-100%, -50%)';
              case 'center':
              default: return 'translate(-50%, -50%)';
            }
          };
          
          return (
            <Draggable
              key={field.id}
              position={{ x: elementX, y: elementY }}
              onStart={() => setDraggingId(field.id)}
              onStop={(_, data) => {
                setDraggingId(null);
                handleDragStop(field.id, data.x, data.y);
              }}
              bounds="parent"
              nodeRef={nodeRefs.current[field.id]}
            >
              <div
                ref={nodeRefs.current[field.id]}
                data-field-id={field.id}
                className="absolute select-none transition-all duration-200"
                style={{
                  zIndex: 2,
                  left: 0,
                  top: 0,
                  transform: getTransform(),
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                }}
                title={`${field.label}: ${field.value || '[Empty]'}`}
              >
                {/* Main content - always shows the field value */}
                <div
                  style={{
                    fontSize,
                    fontFamily: field.fontFamily,
                    color: field.color,
                    fontWeight: 600,
                    whiteSpace: 'pre',
                    textAlign: field.textAlign || 'center',
                  }}
                >
                  {hasValue ? field.value : 
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>[Empty]</span>
                  }
                </div>
                
                {/* Overlay during drag - shows field info */}
                {isDragging && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '2px solid #4f46e5',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      minWidth: '80px',
                      transform: 'translate(-50%, -50%)',
                      left: '50%',
                      top: '50%',
                    }}
                  >
                    <div className="text-center">
                      <div className="text-xs text-gray-600 font-medium mb-1">
                        {field.label}
                      </div>
                      <div
                        style={{
                          fontSize: Math.max(fontSize * 0.8, 12),
                          fontFamily: field.fontFamily,
                          color: field.color,
                          fontWeight: 600,
                        }}
                      >
                        {hasValue ? field.value : '[Empty]'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Anchor point indicator during drag */}
                {isDragging && (
                  <div
                    className="absolute"
                    style={{
                      width: '8px',
                      height: '8px',
                      background: '#ef4444',
                      border: '2px solid white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      zIndex: 10,
                      transform: 'translate(-50%, -50%)',
                      left: textAlign === 'left' ? '0%' : textAlign === 'right' ? '100%' : '50%',
                      top: '50%',
                    }}
                  />
                )}
                
                {/* Hover effect when not dragging */}
                {!isDragging && hasValue && (
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      background: 'rgba(79, 70, 229, 0.1)',
                      border: '1px dashed #4f46e5',
                      borderRadius: '4px',
                      transform: 'translate(-50%, -50%)',
                      left: '50%',
                      top: '50%',
                      minWidth: '60px',
                      minHeight: '24px',
                    }}
                  />
                )}
                
                {/* Static anchor point indicator (always visible) */}
                <div
                  className="absolute opacity-30 hover:opacity-100 transition-opacity duration-200"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: '#6b7280',
                    border: '1px solid white',
                    borderRadius: '50%',
                    zIndex: 3,
                    transform: 'translate(-50%, -50%)',
                    left: textAlign === 'left' ? '0%' : textAlign === 'right' ? '100%' : '50%',
                    top: '50%',
                  }}
                />
              </div>
            </Draggable>
          );
        })}
        {/* Optional display loading or blank when image is not loaded */}
        {!isImgLoaded && (
          <div className="flex items-center justify-center w-full h-full" style={{minHeight: 100}}></div>
        )}
      </div>
    </div>
  );
});

export default CertificatePreview;
