/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UPLOAD_NETWORK_ERROR, uploadService } from '@/services/upload';

import { UploadSkillContent } from './UploadSkillModal';

const mocks = vi.hoisted(() => {
  const importAgentSkillFromZip = vi.fn();

  return {
    closeModal: vi.fn(),
    file: undefined as File | undefined,
    importAgentSkillFromZip,
    messageSuccess: vi.fn(),
    networkErrorGuidanceSentinel: 'NETWORK_ERROR_GUIDANCE_SENTINEL',
    setCanDismissByClickOutside: vi.fn(),
    toolState: { importAgentSkillFromZip },
  };
});

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
}));

vi.mock('@lobehub/ui/base-ui', () => ({
  Alert: ({ title }: { title?: ReactNode }) => <div role="alert">{title}</div>,
  createModal: vi.fn(),
  useModalContext: () => ({
    close: mocks.closeModal,
    setCanDismissByClickOutside: mocks.setCanDismissByClickOutside,
  }),
}));

vi.mock('antd', () => ({
  App: {
    useApp: () => ({ message: { success: mocks.messageSuccess } }),
  },
  Spin: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Typography: {
    Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    Title: ({ children }: { children?: ReactNode }) => <h4>{children}</h4>,
  },
  Upload: {
    Dragger: ({ beforeUpload }: { beforeUpload?: (file: File) => boolean | void }) => (
      <button
        type="button"
        onClick={() => {
          const file = mocks.file;
          if (file) beforeUpload?.(file);
        }}
      >
        dragger-trigger
      </button>
    ),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'upload.networkError') return mocks.networkErrorGuidanceSentinel;
      if (key === 'agentSkillModal.importError')
        return `IMPORT_ERROR_TITLE:${String(options?.error ?? '')}`;
      return key;
    },
  }),
}));

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ allowed: true }),
}));

vi.mock('@/libs/trpc/client/lambda', () => ({
  lambdaClient: {
    file: { createFile: { mutate: vi.fn() } },
  },
}));

vi.mock('@/store/tool', () => ({
  useToolStore: (selector: (state: typeof mocks.toolState) => unknown) => selector(mocks.toolState),
}));

const uploadFileToS3Spy = vi.spyOn(uploadService, 'uploadFileToS3');

describe('UploadSkillContent', () => {
  beforeEach(() => {
    mocks.file = undefined;
    uploadFileToS3Spy.mockReset();
    uploadFileToS3Spy.mockRejectedValue(UPLOAD_NETWORK_ERROR);
  });

  it('renders localized network-error guidance instead of the raw NetWorkError when the S3 upload rejects', async () => {
    // Given
    const file = new File(['skill-zip'], 'skill.zip', { type: 'application/zip' });
    mocks.file = file;

    // When
    render(<UploadSkillContent />);
    fireEvent.click(screen.getByRole('button', { name: 'dragger-trigger' }));

    // Then
    const alert = await screen.findByRole('alert');
    expect(uploadFileToS3Spy).toHaveBeenCalledWith(file, { directory: 'skills' });
    expect(alert.textContent).toContain(mocks.networkErrorGuidanceSentinel);
    expect(alert.textContent).not.toContain('NetWorkError');
  });
});
