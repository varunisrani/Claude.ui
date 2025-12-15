import { Button, Switch } from '@/components/ui';
import type { UserSettings, GeneralSecretFieldConfig, ApiFieldKey } from '@/types';
import { SecretInput } from '@/components/settings/inputs/SecretInput';

interface GeneralSettingsTabProps {
  fields: GeneralSecretFieldConfig[];
  settings: UserSettings;
  revealedFields: Record<ApiFieldKey, boolean>;
  onSecretChange: (field: ApiFieldKey, value: string) => void;
  onToggleVisibility: (field: ApiFieldKey) => void;
  onDeleteAllChats: () => void;
  onNotificationSoundChange: (enabled: boolean) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  fields,
  settings,
  revealedFields,
  onSecretChange,
  onToggleVisibility,
  onDeleteAllChats,
  onNotificationSoundChange,
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="mb-3 text-sm font-medium text-text-primary sm:mb-4 dark:text-text-dark-primary">
        Sandbox Environment
      </h2>
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="rounded-lg border border-border p-3 sm:border-0 sm:p-0 dark:border-border-dark">
            <div>
              <h3 className="text-sm font-medium text-text-primary dark:text-text-dark-primary">
                {field.label}
              </h3>
              <p className="mt-0.5 text-xs text-text-tertiary dark:text-text-dark-tertiary">
                {field.description}
              </p>
            </div>
            <SecretInput
              value={settings[field.key] ?? ''}
              placeholder={field.placeholder}
              isVisible={revealedFields[field.key]}
              onChange={(value) => onSecretChange(field.key, value)}
              onToggleVisibility={() => onToggleVisibility(field.key)}
              helperText={field.helperText}
            />
          </div>
        ))}
      </div>
    </div>

    <div>
      <h2 className="mb-3 text-sm font-medium text-text-primary sm:mb-4 dark:text-text-dark-primary">
        Notifications
      </h2>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:p-0 dark:border-border-dark">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary dark:text-text-dark-primary">
              Sound Notification
            </h3>
            <p className="mt-0.5 text-xs text-text-tertiary dark:text-text-dark-tertiary">
              Play a sound when the assistant finishes responding.
            </p>
          </div>
          <Switch
            checked={settings.notification_sound_enabled ?? true}
            onCheckedChange={onNotificationSoundChange}
          />
        </div>
      </div>
    </div>

    <div>
      <h2 className="mb-3 text-sm font-medium text-text-primary sm:mb-4 dark:text-text-dark-primary">
        Data Management
      </h2>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:p-0 dark:border-border-dark">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary dark:text-text-dark-primary">
              Delete All Chats
            </h3>
            <p className="mt-0.5 text-xs text-text-tertiary dark:text-text-dark-tertiary">
              Permanently delete all chat history. This action cannot be undone.
            </p>
          </div>
          <Button
            type="button"
            onClick={onDeleteAllChats}
            variant="outline"
            size="sm"
            className="w-full border-error-200 text-error-600 hover:bg-error-50 sm:w-auto dark:border-error-800 dark:text-error-400 dark:hover:bg-error-400/10"
          >
            Delete All
          </Button>
        </div>
      </div>
    </div>
  </div>
);
