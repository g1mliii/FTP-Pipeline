import type { RefObject } from "react";
import type { CheckResult, SecretStatus } from "../../../shared/setup-types";
import { ExpandableMessage } from "./ExpandableMessage";
import { SecretFieldCard } from "./SecretFieldCard";
import { TextField } from "./TextField";

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
  const shopifySessionLabel =
    shopifyAuthCheck?.status === "ready" ? "Ready" : shopifyAuthCheck?.status === "action_required" ? "Store issue" : "Needs login";
  const shopifySessionTitle = shopifyAuthCheck?.status === "ready" ? "Shopify session ready" : "Shopify session";
  const shopifySessionHint =
    shopifyAuthCheck?.status === "ready"
      ? "Shopify CLI is already signed in for this store."
      : "Sign in only if this store has not been connected on this machine yet.";
  const shouldOpenOptionalDetails = Boolean(figmaTokenStatus?.stored || figmaTokenInput.trim());

  return (
    <div className="connection-stack connections-step">
      <section className="details-section">
        <div className="details-section-header">
          <div className="min-w-0">
            <h4>Project details</h4>
            <p className="details-section-copy">Fill in these three fields, then save.</p>
          </div>
        </div>

        <div className="form-grid connections-form-grid">
          <TextField
            ref={storeDomainRef}
            autoComplete="off"
            error={errors.storeDomain}
            inputMode="url"
            label="Shopify Store Domain"
            name="shopifyStoreDomain"
            placeholder="your-store.myshopify.com…"
            spellCheck={false}
            type="text"
            value={storeDomain}
            onChange={(event) => onChangeStoreDomain(event.target.value)}
          />

          <TextField
            ref={figmaUrlRef}
            autoComplete="off"
            error={errors.figmaUrl}
            inputMode="url"
            label="Figma File URL"
            labelClassName="is-wide"
            name="figmaUrl"
            placeholder="https://www.figma.com/design/FILE_KEY/Example…"
            spellCheck={false}
            type="url"
            value={figmaUrl}
            onChange={(event) => onChangeFigmaUrl(event.target.value)}
          />

          <TextField
            ref={designSlugRef}
            autoComplete="off"
            error={errors.designSlugDraft}
            label="Project Name"
            name="designSlug"
            placeholder="my-project-name…"
            spellCheck={false}
            type="text"
            value={designSlugDraft}
            onChange={(event) => onChangeDesignSlugDraft(event.target.value)}
          />
        </div>

        <div className="panel-actions details-primary-actions">
          <button className="button button-action" type="button" disabled={busy} onClick={onSaveConnections}>
            Save details
          </button>
        </div>
      </section>

      <section className="details-support-grid">
        {shopifyAuthCheck ? (
          <article className={`check-card is-compact connections-session-card${shopifyAuthCheck.status === "ready" ? " is-ready" : ""}`}>
            <div className="check-row">
              <div className="min-w-0">
                <h4>{shopifySessionTitle}</h4>
                <ExpandableMessage summaryLabel="Show session details" text={shopifyAuthCheck.detail} />
              </div>
              <span className={`status-chip${shopifyAuthCheck.status === "ready" ? " is-ready-pill" : ""}`}>
                {shopifySessionLabel}
              </span>
            </div>
            <p className="hint-copy">{shopifySessionHint}</p>
            <div className="panel-actions details-session-actions">
              <button className="button button-secondary button-inline" type="button" disabled={busy || !storeDomain.trim()} onClick={onStartShopifyAuth}>
                {shopifyAuthCheck?.status === "ready" ? "Recheck session" : "Start Shopify login"}
              </button>
            </div>
          </article>
        ) : null}

        <SecretFieldCard
          busy={busy}
          clearLabel="Clear password"
          description="Optional, but usually needed when the storefront preview is protected by a password page."
          hint="If preview checks open a password page, save the storefront password here so the checks can continue."
          inputLabel="Storefront password"
          inputName="shopifyStorefrontPassword"
          inputPlaceholder="Save this if the storefront preview is password-protected…"
          inputValue={storefrontPasswordInput}
          isOptional
          saveDisabled={!storefrontPasswordInput.trim()}
          saveLabel="Save password"
          status={storefrontPasswordStatus}
          title="Storefront Password"
          onChange={onChangeStorefrontPasswordInput}
          onClear={onClearStorefrontPassword}
          onSave={onSaveStorefrontPassword}
        />
      </section>

      <details className="details-optional-panel" open={shouldOpenOptionalDetails}>
        <summary>
          <span>Advanced optional access</span>
          <small>The Figma API token is only for older repo scripts that explicitly ask for FIGMA_TOKEN.</small>
        </summary>

        <div className="secret-grid connections-secret-grid">
          <SecretFieldCard
            busy={busy}
            clearLabel="Clear token"
            description={figmaTokenStatus?.detail ?? "Vault status unavailable."}
            hint="Only for repo scripts that still ask for FIGMA_TOKEN."
            inputLabel="Figma API token"
            inputName="figmaToken"
            inputPlaceholder="Paste a token only if a script asks for it…"
            inputValue={figmaTokenInput}
            isOptional
            saveDisabled={!figmaTokenInput.trim()}
            saveLabel="Save token"
            status={figmaTokenStatus}
            title="Figma API Token"
            onChange={onChangeFigmaTokenInput}
            onClear={onClearFigmaToken}
            onSave={onSaveFigmaToken}
          />
        </div>
      </details>
    </div>
  );
}
