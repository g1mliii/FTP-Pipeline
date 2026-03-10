import type { RefObject } from "react";
import type { CheckResult, SecretStatus } from "../../../shared/setup-types";
import { prettyStatus, statusTone } from "../lib/steps";

interface ConnectionFieldErrors {
  storeDomain?: string;
  figmaUrl?: string;
  designSlugDraft?: string;
}

interface ConnectionsStepProps {
  busy: boolean;
  claudeAuthCheck?: CheckResult;
  claudeFigmaCheck?: CheckResult;
  connectionChecks: CheckResult[];
  codexFigmaCheck?: CheckResult;
  errors: ConnectionFieldErrors;
  figmaTokenInput: string;
  figmaTokenStatus?: SecretStatus;
  onChangeDesignSlugDraft: (value: string) => void;
  onChangeFigmaTokenInput: (value: string) => void;
  onChangeFigmaUrl: (value: string) => void;
  onChangeStoreDomain: (value: string) => void;
  onChangeStorefrontPasswordInput: (value: string) => void;
  onClearFigmaToken: () => void;
  onClearStorefrontPassword: () => void;
  onSaveConnections: () => void;
  onSaveFigmaToken: () => void;
  onSaveStorefrontPassword: () => void;
  onStartClaudeAuth: () => void;
  onStartClaudeFigmaAuth: () => void;
  onStartCodexFigmaAuth: () => void;
  onStartShopifyAuth: () => void;
  shopifyAuthCheck?: CheckResult;
  storeDomain: string;
  storeDomainRef: RefObject<HTMLInputElement | null>;
  storefrontPasswordInput: string;
  storefrontPasswordStatus?: SecretStatus;
  figmaUrl: string;
  figmaUrlRef: RefObject<HTMLInputElement | null>;
  designSlugDraft: string;
  designSlugRef: RefObject<HTMLInputElement | null>;
}

const formatSecretStatus = (secretStatus: SecretStatus | undefined) => {
  if (!secretStatus) {
    return "Unknown";
  }
  return secretStatus.stored ? "Stored" : "Not stored";
};

export function ConnectionsStep({
  busy,
  claudeAuthCheck,
  claudeFigmaCheck,
  connectionChecks,
  codexFigmaCheck,
  designSlugDraft,
  designSlugRef,
  errors,
  figmaTokenInput,
  figmaTokenStatus,
  figmaUrl,
  figmaUrlRef,
  onChangeDesignSlugDraft,
  onChangeFigmaTokenInput,
  onChangeFigmaUrl,
  onChangeStoreDomain,
  onChangeStorefrontPasswordInput,
  onClearFigmaToken,
  onClearStorefrontPassword,
  onSaveConnections,
  onSaveFigmaToken,
  onSaveStorefrontPassword,
  onStartClaudeAuth,
  onStartClaudeFigmaAuth,
  onStartCodexFigmaAuth,
  onStartShopifyAuth,
  shopifyAuthCheck,
  storeDomain,
  storeDomainRef,
  storefrontPasswordInput,
  storefrontPasswordStatus
}: ConnectionsStepProps) {
  return (
    <div className="connection-stack">
      <div className="auth-grid">
        {[shopifyAuthCheck, claudeAuthCheck, claudeFigmaCheck, codexFigmaCheck]
          .filter(Boolean)
          .map((item) => (
            <article key={item?.id} className={`check-card auth-card ${statusTone[item!.status]}`}>
              <div className="check-row">
                <div className="min-w-0">
                  <h4>{item!.label}</h4>
                  <p>{item!.detail}</p>
                </div>
                <span className="status-chip">{prettyStatus(item!.status)}</span>
              </div>
            </article>
          ))}
      </div>

      <div className="form-grid">
        <label>
          <span>Shopify Store Domain</span>
          <input
            ref={storeDomainRef}
            autoComplete="off"
            inputMode="url"
            name="shopifyStoreDomain"
            placeholder="your-store.myshopify.com…"
            spellCheck={false}
            type="text"
            value={storeDomain}
            onChange={(event) => onChangeStoreDomain(event.target.value)}
          />
          {errors.storeDomain ? <small className="field-error">{errors.storeDomain}</small> : null}
        </label>

        <label className="is-wide">
          <span>Figma File URL</span>
          <input
            ref={figmaUrlRef}
            autoComplete="off"
            inputMode="url"
            name="figmaUrl"
            placeholder="https://www.figma.com/design/FILE_KEY/Example…"
            spellCheck={false}
            type="url"
            value={figmaUrl}
            onChange={(event) => onChangeFigmaUrl(event.target.value)}
          />
          {errors.figmaUrl ? <small className="field-error">{errors.figmaUrl}</small> : null}
        </label>

        <label>
          <span>Design Slug</span>
          <input
            ref={designSlugRef}
            autoComplete="off"
            name="designSlug"
            placeholder="my-design-slug…"
            spellCheck={false}
            type="text"
            value={designSlugDraft}
            onChange={(event) => onChangeDesignSlugDraft(event.target.value)}
          />
          {errors.designSlugDraft ? <small className="field-error">{errors.designSlugDraft}</small> : null}
        </label>
      </div>

      <div className="secret-grid">
        <article className="secret-card">
          <div className="secret-header">
            <div className="min-w-0">
              <h4>Figma Token</h4>
              <p>{figmaTokenStatus?.detail ?? "Secure storage status unavailable."}</p>
            </div>
            <span className={`status-chip ${figmaTokenStatus?.stored ? "is-ready-pill" : ""}`}>{formatSecretStatus(figmaTokenStatus)}</span>
          </div>
          <input
            autoComplete="off"
            name="figmaToken"
            placeholder="Save FIGMA_TOKEN in the OS vault…"
            spellCheck={false}
            type="password"
            value={figmaTokenInput}
            onChange={(event) => onChangeFigmaTokenInput(event.target.value)}
          />
          <div className="button-row">
            <button className="button" type="button" disabled={busy || !figmaTokenInput.trim()} onClick={onSaveFigmaToken}>
              Save Token
            </button>
            <button className="button button-secondary" type="button" disabled={busy} onClick={onClearFigmaToken}>
              Clear Token
            </button>
          </div>
        </article>

        <article className="secret-card">
          <div className="secret-header">
            <div className="min-w-0">
              <h4>Storefront Password</h4>
              <p>{storefrontPasswordStatus?.detail ?? "Secure storage status unavailable."}</p>
            </div>
            <span className={`status-chip ${storefrontPasswordStatus?.stored ? "is-ready-pill" : ""}`}>{formatSecretStatus(storefrontPasswordStatus)}</span>
          </div>
          <input
            autoComplete="off"
            name="shopifyStorefrontPassword"
            placeholder="Optional, only for password-protected previews…"
            spellCheck={false}
            type="password"
            value={storefrontPasswordInput}
            onChange={(event) => onChangeStorefrontPasswordInput(event.target.value)}
          />
          <div className="button-row">
            <button className="button" type="button" disabled={busy || !storefrontPasswordInput.trim()} onClick={onSaveStorefrontPassword}>
              Save Password
            </button>
            <button className="button button-secondary" type="button" disabled={busy} onClick={onClearStorefrontPassword}>
              Clear Password
            </button>
          </div>
        </article>
      </div>

      <div className="panel-actions">
        <button className="button" type="button" disabled={busy} onClick={onSaveConnections}>
          Save Connection Context
        </button>
        <button className="button button-secondary" type="button" disabled={busy || !storeDomain.trim()} onClick={onStartShopifyAuth}>
          {shopifyAuthCheck?.status === "ready" ? "Reconnect Shopify" : "Start Shopify Auth"}
        </button>
        <button className="button button-secondary" type="button" disabled={busy} onClick={onStartClaudeAuth}>
          {claudeAuthCheck?.status === "ready" ? "Refresh Claude Auth" : "Start Claude Auth"}
        </button>
        <button className="button button-secondary" type="button" disabled={busy} onClick={onStartClaudeFigmaAuth}>
          {claudeFigmaCheck?.status === "ready" ? "Refresh Claude Figma" : "Setup Claude Figma"}
        </button>
        <button className="button button-secondary" type="button" disabled={busy} onClick={onStartCodexFigmaAuth}>
          {codexFigmaCheck?.status === "ready" ? "Refresh Codex Figma" : "Connect Codex Figma"}
        </button>
      </div>

      <div className="check-list compact-grid">
        {connectionChecks.map((item) => (
          <article key={item.id} className={`check-card ${statusTone[item.status]}`}>
            <div className="check-row">
              <div className="min-w-0">
                <h4>{item.label}</h4>
                <p>{item.detail}</p>
              </div>
              <span className="status-chip">{prettyStatus(item.status)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
