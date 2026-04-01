import { vi } from 'vitest';

export type SharpMockInstance = {
  trim: ReturnType<typeof vi.fn>;
  flatten: ReturnType<typeof vi.fn>;
  png: ReturnType<typeof vi.fn>;
  toFile: ReturnType<typeof vi.fn>;
};

const sharpMockState = vi.hoisted(() => {
  const instances: SharpMockInstance[] = [];
  const sharpMock = vi.fn(() => {
    const instance: SharpMockInstance = {
      trim: vi.fn().mockReturnThis(),
      flatten: vi.fn().mockReturnThis(),
      png: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
    };
    instances.push(instance);
    return instance;
  });

  return { instances, sharpMock };
});

vi.mock('sharp', () => ({
  default: sharpMockState.sharpMock,
}));

export const sharpMock = sharpMockState.sharpMock;
export const sharpInstances = sharpMockState.instances;

export const resetSharpMock = () => {
  sharpMock.mockClear();
  sharpInstances.splice(0, sharpInstances.length);
};
