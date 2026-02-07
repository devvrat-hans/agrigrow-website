'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  IconRotateClockwise, 
  IconRotate, 
  IconCrop, 
  IconCheck, 
  IconX,
  IconRotate2,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ImageEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** The image source (base64 or URL) */
  imageSrc: string;
  /** Callback when image is saved with edits */
  onSave: (editedImageBase64: string) => void;
}

/**
 * ImageEditModal Component
 * 
 * Provides rotate and crop functionality for uploaded images.
 */
export function ImageEditModal({
  isOpen,
  onClose,
  imageSrc,
  onSave,
}: ImageEditModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // Load image when modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setOriginalImage(img);
        setRotation(0);
        setCropStart({ x: 0, y: 0 });
        setCropEnd({ x: img.width, y: img.height });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Draw image on canvas with current rotation
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalImage) return;

    // Calculate dimensions based on rotation
    const isRotated = rotation % 180 !== 0;
    const width = isRotated ? originalImage.height : originalImage.width;
    const height = isRotated ? originalImage.width : originalImage.height;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear and draw
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      originalImage,
      -originalImage.width / 2,
      -originalImage.height / 2
    );
    ctx.restore();

    // Draw crop overlay if cropping
    if (isCropping) {
      const minX = Math.min(cropStart.x, cropEnd.x);
      const minY = Math.min(cropStart.y, cropEnd.y);
      const maxX = Math.max(cropStart.x, cropEnd.x);
      const maxY = Math.max(cropStart.y, cropEnd.y);

      // Darken area outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, minY);
      ctx.fillRect(0, maxY, width, height - maxY);
      ctx.fillRect(0, minY, minX, maxY - minY);
      ctx.fillRect(maxX, minY, width - maxX, maxY - minY);

      // Draw crop border
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

      // Draw corner handles
      const handleSize = 12;
      ctx.fillStyle = '#22c55e';
      // Top-left
      ctx.fillRect(minX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(maxX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(minX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(maxX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
    }
  }, [rotation, originalImage, isCropping, cropStart, cropEnd]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Rotate image
  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  // Start cropping mode
  const handleStartCrop = () => {
    setIsCropping(true);
    if (originalImage) {
      const isRotated = rotation % 180 !== 0;
      const width = isRotated ? originalImage.height : originalImage.width;
      const height = isRotated ? originalImage.width : originalImage.height;
      // Initialize crop area to center 80%
      const margin = 0.1;
      setCropStart({ x: width * margin, y: height * margin });
      setCropEnd({ x: width * (1 - margin), y: height * (1 - margin) });
    }
  };

  // Handle mouse/touch events for crop selection
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !isCropping) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, canvasRef.current!.width));
    const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, canvasRef.current!.height));
    
    setCropEnd({ x, y });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Apply crop
  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const minX = Math.min(cropStart.x, cropEnd.x);
    const minY = Math.min(cropStart.y, cropEnd.y);
    const cropWidth = Math.abs(cropEnd.x - cropStart.x);
    const cropHeight = Math.abs(cropEnd.y - cropStart.y);

    if (cropWidth < 50 || cropHeight < 50) {
      // Crop area too small
      setIsCropping(false);
      return;
    }

    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    // Draw cropped portion
    ctx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    // Create new image from cropped canvas
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setRotation(0);
      setCropStart({ x: 0, y: 0 });
      setCropEnd({ x: img.width, y: img.height });
    };
    img.src = croppedCanvas.toDataURL('image/jpeg', 0.9);
    
    setIsCropping(false);
  };

  // Cancel crop
  const cancelCrop = () => {
    setIsCropping(false);
    drawCanvas();
  };

  // Save edited image
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If we're still in crop mode, apply the crop first
    if (isCropping) {
      applyCrop();
    }

    // Get the edited image as base64
    const editedImage = canvas.toDataURL('image/jpeg', 0.9);
    onSave(editedImage);
    onClose();
  };

  // Reset all edits
  const handleReset = () => {
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setOriginalImage(img);
        setRotation(0);
        setIsCropping(false);
        setCropStart({ x: 0, y: 0 });
        setCropEnd({ x: img.width, y: img.height });
      };
      img.src = imageSrc;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        variant="mobile-sheet"
        hideCloseButton
        className={cn(
          // Mobile: full width bottom sheet
          'w-full max-w-none',
          'h-[90vh] max-h-[90vh]',
          'p-0 overflow-hidden flex flex-col',
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-800',
          // Desktop: centered dialog
          'sm:w-[calc(100vw-1rem)] sm:max-w-lg',
          'sm:h-auto sm:max-h-[700px]'
        )}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Edit Image
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-950">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={cn(
              'max-w-full max-h-full object-contain',
              'rounded-lg shadow-sm',
              isCropping && 'cursor-crosshair'
            )}
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Tools */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          {isCropping ? (
            /* Crop mode tools */
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelCrop}
                className="flex items-center gap-2"
              >
                <IconX className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyCrop}
                className="flex items-center gap-2"
              >
                <IconCheck className="w-4 h-4" />
                Apply Crop
              </Button>
            </div>
          ) : (
            /* Normal mode tools */
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRotate(-90)}
                className="flex items-center gap-1.5"
                title="Rotate Left"
              >
                <IconRotate className="w-4 h-4" />
                <span className="hidden sm:inline">Left</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRotate(90)}
                className="flex items-center gap-1.5"
                title="Rotate Right"
              >
                <IconRotateClockwise className="w-4 h-4" />
                <span className="hidden sm:inline">Right</span>
              </Button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartCrop}
                className="flex items-center gap-1.5"
                title="Crop Image"
              >
                <IconCrop className="w-4 h-4" />
                <span className="hidden sm:inline">Crop</span>
              </Button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-gray-500"
                title="Reset"
              >
                <IconRotate2 className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isCropping}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageEditModal;
