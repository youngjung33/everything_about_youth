import type { Clock, Logger } from "./system";

/** 서비스(섹션) 하나의 정의. 기본값은 코드에 두고, 운영 중 바꾼 값(override)만 저장소에 둔다. */
export interface FeatureDefinition {
  id: string;
  defaultEnabled: boolean;
}

/** 운영자가 바꾼 켜짐/꺼짐 값 저장소. 저장소가 없거나 비어 있으면 [FeatureDefinition.defaultEnabled] 를 쓴다. */
export interface FeatureFlagStore {
  getOverrides(): Promise<Record<string, boolean>>;
  setOverride(id: string, enabled: boolean, updatedAt: string): Promise<void>;
  clearOverride(id: string): Promise<void>;
}

export interface FeatureState {
  id: string;
  enabled: boolean;
  defaultEnabled: boolean;
  /** 기본값이 아니라 운영자가 바꾼 값이면 true */
  overridden: boolean;
}

export class UnknownFeatureError extends Error {
  constructor(public readonly featureId: string, known: string[]) {
    super(`알 수 없는 서비스입니다: ${featureId} (사용 가능: ${known.join(", ")})`);
  }
}

/**
 * 서비스 켜기/끄기. 앱은 이 값을 시작할 때 받아 와서 꺼진 서비스를 숨기고, 서버는 꺼진 서비스의 API 를 막는다.
 *
 * 저장소를 읽지 못해도 서비스 전체가 멈추지 않도록, 읽기 실패 시에는 기본값으로 동작한다.
 */
export class FeatureFlags {
  constructor(
    private readonly definitions: FeatureDefinition[],
    private readonly store: FeatureFlagStore,
    private readonly clock: Clock,
    private readonly logger?: Logger,
  ) {}

  async list(): Promise<FeatureState[]> {
    const overrides = await this.readOverrides();
    return this.definitions.map((d) => {
      const overridden = Object.hasOwn(overrides, d.id);
      return {
        id: d.id,
        enabled: overridden ? overrides[d.id]! : d.defaultEnabled,
        defaultEnabled: d.defaultEnabled,
        overridden,
      };
    });
  }

  /** 모르는 서비스는 꺼진 것으로 본다. */
  async isEnabled(id: string): Promise<boolean> {
    return (await this.list()).find((s) => s.id === id)?.enabled ?? false;
  }

  async set(id: string, enabled: boolean): Promise<void> {
    this.assertKnown(id);
    await this.store.setOverride(id, enabled, this.clock.now().toISOString());
  }

  /** 운영자가 바꾼 값을 지우고 기본값으로 되돌린다. */
  async reset(id: string): Promise<void> {
    this.assertKnown(id);
    await this.store.clearOverride(id);
  }

  private assertKnown(id: string): void {
    if (!this.definitions.some((d) => d.id === id)) {
      throw new UnknownFeatureError(id, this.definitions.map((d) => d.id));
    }
  }

  private async readOverrides(): Promise<Record<string, boolean>> {
    try {
      return await this.store.getOverrides();
    } catch (e) {
      this.logger?.warn(`[features] 설정을 읽지 못해 기본값을 사용합니다: ${e instanceof Error ? e.message : String(e)}`);
      return {};
    }
  }
}
