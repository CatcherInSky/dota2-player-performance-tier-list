import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      
      {/* 模态框 */}
      <div className="relative bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        
        {/* 内容 */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>
        
        {/* 底部按钮 */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

