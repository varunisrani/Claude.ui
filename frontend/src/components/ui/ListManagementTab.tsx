import { ReactNode, useState } from 'react';
import { Button, ConfirmDialog } from '@/components/ui';
import { Plus, Loader2, LucideIcon, Edit2, Trash2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface ListManagementTabProps<T> {
  title: string;
  description: string;
  items: T[] | null;
  emptyIcon: LucideIcon;
  emptyText: string;
  emptyButtonText: string;
  addButtonText: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: (item: T) => string;
  getItemKey: (item: T, index: number) => string;
  onAdd: () => void;
  onEdit?: (index: number) => void;
  onDelete: (index: number) => void | Promise<void>;
  renderItem: (item: T, index: number) => ReactNode;
  maxLimit?: number;
  isMaxLimitReached?: boolean;
  footerContent?: ReactNode;
  logContext: string;
}

export const ListManagementTab = <T,>({
  title,
  description,
  items,
  emptyIcon: EmptyIcon,
  emptyText,
  emptyButtonText,
  addButtonText,
  deleteConfirmTitle,
  deleteConfirmMessage,
  getItemKey,
  onAdd,
  onEdit,
  onDelete,
  renderItem,
  maxLimit,
  isMaxLimitReached,
  footerContent,
  logContext,
}: ListManagementTabProps<T>) => {
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const handleCloseDeleteDialog = () => {
    setPendingDeleteIndex(null);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIndex === null) return;
    setDeletingIndex(pendingDeleteIndex);
    try {
      await onDelete(pendingDeleteIndex);
      setPendingDeleteIndex(null);
    } catch (error) {
      logger.error(`Failed to delete item`, logContext, error);
    } finally {
      setDeletingIndex(null);
    }
  };

  const deleteTargetItem =
    pendingDeleteIndex !== null && items?.[pendingDeleteIndex] ? items[pendingDeleteIndex] : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-text-primary dark:text-text-dark-primary">
            {title}
          </h2>
          <Button
            type="button"
            onClick={onAdd}
            variant="outline"
            size="sm"
            className="flex w-full items-center justify-center gap-1.5 sm:w-auto"
            disabled={isMaxLimitReached}
            title={
              isMaxLimitReached && maxLimit ? `Maximum of ${maxLimit} items reached` : undefined
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {addButtonText}
          </Button>
        </div>

        <p className="mb-3 text-xs text-text-tertiary sm:mb-4 dark:text-text-dark-tertiary">
          {description}
        </p>

        {!items || items.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center sm:p-8 dark:border-border-dark">
            <EmptyIcon className="mx-auto mb-3 h-8 w-8 text-text-quaternary dark:text-text-dark-quaternary" />
            <p className="mb-3 text-sm text-text-tertiary dark:text-text-dark-tertiary">
              {emptyText}
            </p>
            <Button type="button" onClick={onAdd} variant="primary" size="sm" className="w-full sm:w-auto">
              {emptyButtonText}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={getItemKey(item, index)}
                className="rounded-lg border border-border p-3 transition-colors hover:border-border-hover sm:p-4 dark:border-border-dark dark:hover:border-border-dark-hover"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
                  <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
                  <div className="flex items-center justify-end gap-2 border-t border-border pt-3 sm:ml-3 sm:gap-1 sm:border-0 sm:pt-0 dark:border-border-dark">
                    {onEdit && (
                      <Button
                        type="button"
                        onClick={() => onEdit(index)}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-text-tertiary hover:text-text-secondary sm:h-7 sm:w-7 dark:text-text-dark-tertiary dark:hover:text-text-dark-secondary"
                        aria-label="Edit item"
                      >
                        <Edit2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => setPendingDeleteIndex(index)}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-error-600 hover:bg-error-50 sm:h-7 sm:w-7 dark:text-error-400 dark:hover:bg-error-400/10"
                      aria-label="Delete item"
                      disabled={deletingIndex === index}
                    >
                      {deletingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin sm:h-3.5 sm:w-3.5" />
                      ) : (
                        <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {footerContent}
      </div>

      <ConfirmDialog
        isOpen={pendingDeleteIndex !== null}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmTitle}
        message={
          deleteTargetItem
            ? deleteConfirmMessage(deleteTargetItem)
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};
