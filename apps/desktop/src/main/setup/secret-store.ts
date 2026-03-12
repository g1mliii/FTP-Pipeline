import type { SecretId, SecretStatus } from "../../shared/setup-types";

const SERVICE_NAME = "figma-shopify-flow.desktop";

const SECRET_META: Record<SecretId, { account: string; label: string }> = {
  figmaToken: { account: "figma-token", label: "Optional Figma API token" },
  shopifyStorefrontPassword: { account: "shopify-storefront-password", label: "Storefront password" }
};

export interface SecretStoreAdapter {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, value: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

const loadKeytar = async (): Promise<SecretStoreAdapter> => {
  const keytar = await import("keytar");
  return (keytar.default ?? keytar) as SecretStoreAdapter;
};

export class SecretStore {
  private adapterPromise: Promise<SecretStoreAdapter> | null = null;

  private async getAdapter() {
    if (!this.adapterPromise) {
      this.adapterPromise = loadKeytar();
    }
    return this.adapterPromise;
  }

  async isAvailable() {
    try {
      await this.getAdapter();
      return true;
    } catch {
      return false;
    }
  }

  async getSecret(id: SecretId) {
    const adapter = await this.getAdapter();
    return adapter.getPassword(SERVICE_NAME, SECRET_META[id].account);
  }

  async setSecret(id: SecretId, value: string) {
    const adapter = await this.getAdapter();
    await adapter.setPassword(SERVICE_NAME, SECRET_META[id].account, value);
  }

  async deleteSecret(id: SecretId) {
    const adapter = await this.getAdapter();
    return adapter.deletePassword(SERVICE_NAME, SECRET_META[id].account);
  }

  async getStatuses(): Promise<SecretStatus[]> {
    const available = await this.isAvailable();
    if (!available) {
      return (Object.keys(SECRET_META) as SecretId[]).map((id) => ({
        id,
        label: SECRET_META[id].label,
        stored: false,
        detail: "Secure OS-backed secret storage is unavailable."
      }));
    }

    return Promise.all(
      (Object.keys(SECRET_META) as SecretId[]).map(async (id) => {
        const stored = Boolean(await this.getSecret(id));
        return {
          id,
          label: SECRET_META[id].label,
          stored,
          detail:
            id === "figmaToken"
              ? stored
                ? "Stored in the OS credential vault for repo scripts that use FIGMA_TOKEN."
                : "Optional. Only needed for repo scripts that use FIGMA_TOKEN instead of Claude/Codex Figma auth."
              : stored
                ? "Stored in the OS credential vault."
                : "Not stored yet."
        };
      })
    );
  }
}
