import { AttachButton } from './AttachButton';
import { EnhanceButton } from './EnhanceButton';
import { PermissionModeSelector } from '@/components/chat/permission-mode-selector/PermissionModeSelector';
import { ModelSelector } from '@/components/chat/model-selector/ModelSelector';
import { ThinkingModeSelector } from '@/components/chat/thinking-mode-selector/ThinkingModeSelector';

export interface InputControlsProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  onAttach?: () => void;
  onEnhance?: () => void;
  dropdownPosition?: 'top' | 'bottom';
  isLoading?: boolean;
  isEnhancing?: boolean;
}

export function InputControls({
  selectedModelId,
  onModelChange,
  onAttach,
  onEnhance,
  dropdownPosition = 'bottom',
  isLoading = false,
  isEnhancing = false,
}: InputControlsProps) {
  return (
    <div
      className="absolute bottom-2 left-2 right-12 flex flex-wrap items-center gap-1 overflow-x-auto sm:bottom-2.5 sm:left-3 sm:right-14 sm:gap-2"
      onClick={(e) => e.preventDefault()}
    >
      {onAttach && <AttachButton onAttach={onAttach} />}

      {onEnhance && (
        <EnhanceButton onEnhance={onEnhance} isEnhancing={isEnhancing} disabled={isLoading} />
      )}

      <PermissionModeSelector dropdownPosition={dropdownPosition} disabled={isLoading} />

      {/* Hide thinking mode on mobile to save space */}
      <div className="hidden sm:block">
        <ThinkingModeSelector dropdownPosition={dropdownPosition} disabled={isLoading} />
      </div>

      <ModelSelector
        selectedModelId={selectedModelId}
        onModelChange={onModelChange}
        dropdownPosition={dropdownPosition}
        disabled={isLoading}
      />
    </div>
  );
}
