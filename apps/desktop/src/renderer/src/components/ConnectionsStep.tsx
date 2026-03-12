import type { RefObject } from "react";
import type { CheckResult, SecretStatus } from "../../../shared/setup-types";

interface ConnectionFieldErrors {
  storeDomain?: string;
  figmaUrl?: string;
  designSlugDraft?: string;
}

interface ConnectionsStepProps {
  busy: boolean;
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
  onStartShopifyAuth,
  shopifyAuthCheck,
  storeDomain,
  storeDomainRef,
  storefrontPasswordInput,
  storefrontPasswordStatus
}: ConnectionsStepProps) {
  return (
    <div className="connection-stack connections-step">
      <div className="form-grid connections-form-grid">
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
          <span>Project Name</span>
          <input
            ref={designSlugRef}
            autoComplete="off"
            name="designSlug"
            placeholder="my-project-name…"
            spellCheck={false}
            type="text"
            value={designSlugDraft}
            onChange={(event) => onChangeDesignSlugDraft(event.target.value)}
          />
          {errors.designSlugDraft ? <small className="field-error">{errors.designSlugDraft}</small> : null}
        </label>
      </div>

      <div className="secret-grid connections-secret-grid">
        <article className="secret-card is-compact">
          <div className="secret-header">
            <div className="min-w-0">
              <h4>Optional Figma API Token</h4>
              <p>{figmaTokenStatus?.detail ?? "Secure storage status unavailable."}</p>
            </div>
            <span className={`status-chip ${figmaTokenStatus?.stored ? "is-ready-pill" : ""}`}>{formatSecretStatus(figmaTokenStatus)}</span>
          </div>
          <input
            className="secret-field"
            autoComplete="off"
            name="figmaToken"
            placeholder="Only save this if a repo script needs FIGMA_TOKEN…"
            spellCheck={false}
            type="password"
            value={figmaTokenInput}
            onChange={(event) => onChangeFigmaTokenInput(event.target.value)}
          />
          <p className="hint-copy">Claude and Codex Figma auth usually make this unnecessary. Use it only for token-based repo flows.</p>
          <div className="button-row">
            <button className="button button-inline" type="button" disabled={busy || !figmaTokenInput.trim()} onClick={onSaveFigmaToken}>
              Save API Token
            </button>
            <button className="button button-secondary button-inline" type="button" disabled={busy} onClick={onClearFigmaToken}>
              Clear API Token
            </button>
          </div>
        </article>

        <article className="secret-card is-compact">
          <div className="secret-header">
            <div className="min-w-0">
              <h4>Storefront Password</h4>
              <p>Optional. Only needed for password-protected Shopify previews and storefront checks.</p>
            </div>
            <span className={`status-chip ${storefrontPasswordStatus?.stored ? "is-ready-pill" : ""}`}>{formatSecretStatus(storefrontPasswordStatus)}</span>
          </div>
          <input
            className="secret-field"
            autoComplete="off"
            name="shopifyStorefrontPassword"
            placeholder="Only save this if the storefront preview shows a password page…"
            spellCheck={false}
            type="password"
            value={storefrontPasswordInput}
            onChange={(event) => onChangeStorefrontPasswordInput(event.target.value)}
          />
          <p className="hint-copy">
            Most stores do not need this. Use it only when Playwright or storefront preview checks must pass through a password page.
          </p>
          <div className="button-row">
            <button className="button button-inline" type="button" disabled={busy || !storefrontPasswordInput.trim()} onClick={onSaveStorefrontPassword}>
              Save Password
            </button>
            <button className="button button-secondary button-inline" type="button" disabled={busy} onClick={onClearStorefrontPassword}>
              Clear Password
            </button>
          </div>
        </article>
      </div>

      <div className="panel-actions">
        <button className="button button-action" type="button" disabled={busy} onClick={onSaveConnections}>
          Save Connection Context
        </button>
        <button className="button button-secondary button-action" type="button" disabled={busy || !storeDomain.trim()} onClick={onStartShopifyAuth}>
          {shopifyAuthCheck?.status === "ready" ? "Check Shopify Session" : "Start Shopify Login"}
        </button>
      </div>

      {shopifyAuthCheck ? (
        <article className="check-card is-compact connections-session-card">
          <div className="check-row">
            <div className="min-w-0">
              <h4>Shopify Session</h4>
              <p>{shopifyAuthCheck.detail}</p>
            </div>
            <span className={`status-chip${shopifyAuthCheck.status === "ready" ? " is-ready-pill" : ""}`}>
              {shopifyAuthCheck.status === "ready" ? "Authenticated" : "Needs Login"}
            </span>
          </div>
          <p className="hint-copy">
            This checks the saved store domain first. If Shopify CLI is already logged in for this store, no browser opens.
            If not, the app starts the Shopify login flow.
          </p>
        </article>
      ) : null}
    </div>
  );
}
